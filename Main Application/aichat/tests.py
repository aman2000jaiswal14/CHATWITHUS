import os
import json
import base64
import pytest
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.conf import settings
from chat.models import UserPublicKey, MessageAttachment
from aichat.models import AIPrivateKey
from aichat.security import DocumentSecurityManager
from aichat.llm import LocalQAEngine
from aichat.services import init_ai_assistant, process_ai_query, derive_shared_key, get_ai_private_key, encrypt_aes_gcm
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization

User = get_user_model()

@pytest.mark.django_db
def test_ai_assistant_username_restricted():
    """Verify that normal users cannot be registered with the name 'AI_Assistant'."""
    with pytest.raises(ValueError) as excinfo:
        User.objects.create_user(username="AI_Assistant", password="Password123!")
    assert "The username 'AI_Assistant' is reserved." in str(excinfo.value)

@pytest.mark.django_db
def test_post_migrate_initialization():
    """Verify that init_ai_assistant registers the user, public key, and private key."""
    init_ai_assistant()
    ai_user = User.objects.get(username="AI_Assistant")
    assert ai_user.username == "AI_Assistant"

    # Verify public key is registered in UserPublicKey
    pk_record = UserPublicKey.objects.filter(user=ai_user).first()
    assert pk_record is not None
    assert pk_record.public_key_json is not None

    # Verify private key is saved in AIPrivateKey
    priv_record = AIPrivateKey.objects.first()
    assert priv_record is not None
    assert priv_record.encrypted_pem is not None

@pytest.mark.django_db
def test_document_classification():
    """Verify role-based access control checking against classification.json rules."""
    rules = {
        "rules": [
            {
                "pattern": "^secret_.*",
                "allowed_roles": ["Admin", "Commander"]
            },
            {
                "pattern": "^confidential_.*",
                "allowed_roles": ["Staff", "Admin", "Commander"]
            },
            {
                "pattern": ".*",
                "allowed_roles": ["*"]
            }
        ]
    }
    # Mocking classification data
    DocumentSecurityManager.load_rules = lambda: rules["rules"]

    assert DocumentSecurityManager.is_file_permitted("secret_codes.txt", "Admin") is True
    assert DocumentSecurityManager.is_file_permitted("secret_codes.txt", "Staff") is False
    assert DocumentSecurityManager.is_file_permitted("confidential_strategy.txt", "Staff") is True
    assert DocumentSecurityManager.is_file_permitted("confidential_strategy.txt", "User") is False
    assert DocumentSecurityManager.is_file_permitted("public_guidelines.txt", "User") is True
    assert DocumentSecurityManager.is_file_permitted("public_guidelines.txt", "Visitor") is True

@pytest.mark.django_db
def test_llm_qa_heuristic_search(tmp_path):
    """Test that the heuristic search ranks terms correctly and filters by role."""
    # Write temp files to a temporary doc folder
    doc_dir = tmp_path / "docs"
    doc_dir.mkdir()

    # Classification rules
    rules = {
        "rules": [
            {"pattern": "^secret_.*", "allowed_roles": ["Admin"]},
            {
                "pattern": ".*",
                "allowed_roles": ["*"]
            }
        ]
    }
    with open(doc_dir / "classification.json", "w") as f:
        json.dump(rules, f)

    with open(doc_dir / "public_guidelines.txt", "w") as f:
        f.write("Welcome to our Chat server. We support file uploads up to 5MB. E2EE is enabled.")

    with open(doc_dir / "secret_codes.txt", "w") as f:
        f.write("Operational clearance code for Area 51 is ALPHA_ZULU_99.")

    # Mock settings.AI_DOC_FOLDER
    old_folder = getattr(settings, 'AI_DOC_FOLDER', None)
    settings.AI_DOC_FOLDER = str(doc_dir)

    try:
        # User role without clearance ('User')
        permitted_user = DocumentSecurityManager.get_permitted_files(User(role="User"))
        ans_user = LocalQAEngine.answer_query("What is the clearance code for Area 51?", permitted_user)
        assert "ALPHA_ZULU_99" not in ans_user
        assert "couldn't find" in ans_user or "I cannot access" in ans_user or "scanned the available" in ans_user

        # Admin role with clearance ('Admin')
        permitted_admin = DocumentSecurityManager.get_permitted_files(User(role="Admin"))
        ans_admin = LocalQAEngine.answer_query("What is the clearance code for Area 51?", permitted_admin)
        assert "ALPHA_ZULU_99" in ans_admin

        # Query public guidelines
        ans_public = LocalQAEngine.answer_query("What is the limit for file uploads?", permitted_user)
        assert "5MB" in ans_public
    finally:
        if old_folder:
            settings.AI_DOC_FOLDER = old_folder
        else:
            delattr(settings, 'AI_DOC_FOLDER')

@pytest.mark.django_db
def test_e2ee_integration_services():
    """Verify that services.process_ai_query handles E2EE translation perfectly."""
    init_ai_assistant()
    ai_user = User.objects.get(username="AI_Assistant")
    
    # Create a user to query the AI
    user = User.objects.create_user(username="test_alice", password="Password123!")
    user.role = "Admin"
    user.save()

    # Generate a temporary P-256 key pair for the client
    client_priv = ec.generate_private_key(ec.SECP256R1())
    client_pub_bytes = client_priv.public_key().public_bytes(
        encoding=serialization.Encoding.X962,
        format=serialization.PublicFormat.UncompressedPoint
    )

    # Format public key JWK representation
    numbers = client_priv.public_key().public_numbers()
    def b64url(val):
        b = val.to_bytes(32, byteorder='big')
        return base64.urlsafe_b64encode(b).decode('utf-8').rstrip('=')

    jwk_dict = {
        "kty": "EC",
        "crv": "P-256",
        "x": b64url(numbers.x),
        "y": b64url(numbers.y)
    }
    jwk_str = json.dumps(jwk_dict)

    # Register user's public key
    UserPublicKey.objects.create(user=user, public_key_json=jwk_str)

    # Derive shared secret for AES-GCM encryption on client side
    ai_pub_record = UserPublicKey.objects.get(user=ai_user)
    ai_private_key = get_ai_private_key()
    shared_key = derive_shared_key(jwk_str, ai_private_key)

    # Encrypt query on client side
    query_text = "What is the limit for file uploads?"
    encrypted_query_b64 = encrypt_aes_gcm(query_text.encode('utf-8'), shared_key)

    # Mock settings.AI_DOC_FOLDER and write a dummy file containing 5MB
    old_folder = getattr(settings, 'AI_DOC_FOLDER', None)
    dummy_dir = os.path.dirname(os.path.abspath(__file__))
    settings.AI_DOC_FOLDER = dummy_dir

    try:
        # Write dummy public guidelines if not existing
        public_file = os.path.join(dummy_dir, "public_guidelines.txt")
        with open(public_file, "w") as f:
            f.write("Welcome. File uploads up to 5MB are allowed.")
            
        # Process query through services.py
        res = process_ai_query(user=user, encrypted_query_or_plain=encrypted_query_b64)
        
        assert res['is_e2ee'] is True
        
        # Decrypt reply on client side
        reply_payload = res['encrypted_reply']
        
        from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
        from cryptography.hazmat.backends import default_backend
        
        reply_bin = base64.b64decode(reply_payload.encode('utf-8'))
        reply_iv = reply_bin[:12]
        reply_ct = reply_bin[12:-16]
        reply_tag = reply_bin[-16:]
        
        cipher = Cipher(
            algorithms.AES(shared_key),
            modes.GCM(reply_iv, reply_tag),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        decrypted_reply = (decryptor.update(reply_ct) + decryptor.finalize()).decode('utf-8')
        
        assert "5MB" in decrypted_reply
    finally:
        if old_folder:
            settings.AI_DOC_FOLDER = old_folder
        else:
            delattr(settings, 'AI_DOC_FOLDER')
