import os
import json
import base64
import uuid
from django.db import transaction
from django.contrib.auth import get_user_model
from django.conf import settings
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

from chat.models import UserPublicKey, Message, MessageAttachment
from chat.services.encryption import encryption_service
from .models import AIPrivateKey
from .security import DocumentSecurityManager
from .llm import LocalQAEngine, OllamaLLMEngine

User = get_user_model()

def check_ai_assistant_status():
    """
    Checks the status of the AI Assistant.
    - If GENERAL_AI module is active but not ADVANCE_AI, it is online.
    - If ADVANCE_AI is active, verifies if Ollama is accessible and configured model exists.
    - Otherwise, offline.
    """
    from chat.services.licensing import LicensingService
    import requests
    
    license_info = LicensingService.get_license_info()
    modules = license_info.get('MODULES', '') if license_info else ''
    
    if 'ADVANCE_AI' in modules:
        try:
            # Check Ollama tags endpoint to see if model exists
            url = getattr(settings, 'OLLAMA_API_URL', 'http://localhost:11434/api/generate')
            tags_url = url.replace('/api/generate', '/api/tags')
            resp = requests.get(tags_url, timeout=2)
            if resp.status_code == 200:
                model_name = getattr(settings, 'OLLAMA_MODEL', 'qwen2.5-coder:1.5b')
                data = resp.json()
                models = [m.get('name') for m in data.get('models', [])]
                if model_name in models:
                    return True
            return False
        except Exception:
            return False
    elif 'GENERAL_AI' in modules:
        return True
    
    return False

def init_ai_assistant():
    """Idempotently initialize the AI Assistant user and keypair."""
    with transaction.atomic():
        ai_user = User.objects.filter(username='AI_Assistant').first()
        if not ai_user:
            ai_user = User(
                username='AI_Assistant',
                name='AI Assistant',
                role='System',
                is_active=True
            )
            ai_user._is_system_ai = True
            # Set random password so login is disabled but it is a valid password
            ai_user.set_password(str(uuid.uuid4()))
            ai_user.save()
            
        # Check if keys are already generated
        has_public_key = UserPublicKey.objects.filter(user=ai_user).exists()
        has_private_key = AIPrivateKey.objects.exists()
        
        if not has_public_key or not has_private_key:
            # Generate new P-256 ECDH Keypair
            private_key = ec.generate_private_key(ec.SECP256R1())
            
            # Serialize Private Key to PEM
            pem_private = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ).decode('utf-8')
            
            # Encrypt the Private Key PEM using standard system encryption service
            encrypted_pem = encryption_service.encrypt_payload(pem_private)
            
            # Store in DB (clear old if any)
            AIPrivateKey.objects.all().delete()
            AIPrivateKey.objects.create(encrypted_pem=encrypted_pem)
            
            # Generate JWK public key
            public_key = private_key.public_key()
            public_numbers = public_key.public_numbers()
            
            def base64url_encode(b):
                return base64.urlsafe_b64encode(b).decode('utf-8').rstrip('=')
                
            x_bytes = public_numbers.x.to_bytes(32, byteorder='big')
            y_bytes = public_numbers.y.to_bytes(32, byteorder='big')
            
            jwk = {
                "kty": "EC",
                "crv": "P-256",
                "x": base64url_encode(x_bytes),
                "y": base64url_encode(y_bytes)
            }
            
            # Store public key JWK JSON in DB
            UserPublicKey.objects.filter(user=ai_user).delete()
            UserPublicKey.objects.create(
                user=ai_user,
                public_key_json=json.dumps(jwk)
            )

def get_ai_private_key():
    key_obj = AIPrivateKey.objects.first()
    if not key_obj:
        return None
    pem = encryption_service.decrypt_payload(key_obj.encrypted_pem)
    return serialization.load_pem_private_key(
        pem.encode('utf-8'),
        password=None,
        backend=default_backend()
    )

def derive_shared_key(user_public_key_jwk_str, ai_private_key):
    """
    Derives the raw ECDH shared key (32 bytes) between the user's public key (JWK)
    and the AI's private key.
    """
    jwk = json.loads(user_public_key_jwk_str)
    
    def base64url_decode(s):
        s += '=' * (4 - len(s) % 4)
        return base64.urlsafe_b64decode(s)
        
    x_int = int.from_bytes(base64url_decode(jwk['x']), byteorder='big')
    y_int = int.from_bytes(base64url_decode(jwk['y']), byteorder='big')
    
    public_numbers = ec.EllipticCurvePublicNumbers(x_int, y_int, ec.SECP256R1())
    user_public_key = public_numbers.public_key(backend=default_backend())
    
    # Derive shared secret (raw X coordinate)
    shared_key = ai_private_key.exchange(ec.ECDH(), user_public_key)
    return shared_key

def encrypt_aes_gcm(plaintext_bytes, key_bytes):
    iv = os.urandom(12)
    cipher = Cipher(
        algorithms.AES(key_bytes),
        modes.GCM(iv),
        backend=default_backend()
    )
    encryptor = cipher.encryptor()
    ciphertext = encryptor.update(plaintext_bytes) + encryptor.finalize()
    combined = iv + ciphertext + encryptor.tag
    return base64.b64encode(combined).decode('utf-8')

def decrypt_aes_gcm(ciphertext_base64, key_bytes):
    data = base64.b64decode(ciphertext_base64.encode('utf-8'))
    iv = data[:12]
    ciphertext = data[12:-16]
    tag = data[-16:]
    
    cipher = Cipher(
        algorithms.AES(key_bytes),
        modes.GCM(iv, tag),
        backend=default_backend()
    )
    decryptor = cipher.decryptor()
    return decryptor.update(ciphertext) + decryptor.finalize()

def decrypt_file_buffer(content_bytes, key_bytes):
    iv = content_bytes[:12]
    ciphertext = content_bytes[12:-16]
    tag = content_bytes[-16:]
    
    cipher = Cipher(
        algorithms.AES(key_bytes),
        modes.GCM(iv, tag),
        backend=default_backend()
    )
    decryptor = cipher.decryptor()
    return decryptor.update(ciphertext) + decryptor.finalize()

def process_ai_query(user, encrypted_query_or_plain, attachment_id=None, use_advance_ai=False):
    """
    Decrypts user query (if E2EE), parses optional attachment, searches permitted documents,
    queries local QA engine, encrypts response, and returns both plain & encrypted versions.
    """
    try:
        ai_user = User.objects.get(username='AI_Assistant')
    except User.DoesNotExist:
        init_ai_assistant()
        ai_user = User.objects.get(username='AI_Assistant')
    
    # 1. Fetch AI keys and user's public key
    ai_private_key = get_ai_private_key()
    user_pubkey_obj = UserPublicKey.objects.filter(user=user).first()
    
    is_e2ee = False
    shared_key = None
    query_plaintext = encrypted_query_or_plain
    
    if ai_private_key and user_pubkey_obj:
        try:
            # Let's derive shared key
            shared_key = derive_shared_key(user_pubkey_obj.public_key_json, ai_private_key)
            # Try to decrypt the query to see if it is encrypted
            try:
                decrypted_bytes = decrypt_aes_gcm(encrypted_query_or_plain, shared_key)
                query_plaintext = decrypted_bytes.decode('utf-8')
                is_e2ee = True
            except Exception:
                # Fallback: Treat as plaintext if decryption fails
                query_plaintext = encrypted_query_or_plain
        except Exception:
            pass

    # 2. Extract attachment text if present
    attachment_content = None
    attachment_name = None
    
    if attachment_id:
        try:
            attachment = MessageAttachment.objects.get(id=attachment_id)
            attachment_name = attachment.decrypted_file_name
            
            # Read attachment content
            file_path = attachment.file.path
            if os.path.exists(file_path):
                # Ensure safety limit of 5MB
                if os.path.getsize(file_path) <= 5242880:
                    with open(file_path, 'rb') as f:
                        file_bytes = f.read()
                        
                    # Decrypt attachment if E2EE
                    if is_e2ee and shared_key:
                        try:
                            decrypted_file_bytes = decrypt_file_buffer(file_bytes, shared_key)
                            # Safe read first N bytes
                            max_size = getattr(settings, 'MAX_ATTACHMENT_READ_SIZE', 512000)
                            attachment_content = decrypted_file_bytes[:max_size].decode('utf-8', errors='ignore')
                        except Exception:
                            # If decryption fails, try reading as plaintext
                            max_size = getattr(settings, 'MAX_ATTACHMENT_READ_SIZE', 512000)
                            attachment_content = file_bytes[:max_size].decode('utf-8', errors='ignore')
                    else:
                        max_size = getattr(settings, 'MAX_ATTACHMENT_READ_SIZE', 512000)
                        attachment_content = file_bytes[:max_size].decode('utf-8', errors='ignore')
                else:
                    attachment_content = "[Error: File too large]"
        except Exception:
            pass

    # 3. Retrieve permitted documents list for user
    permitted_files = DocumentSecurityManager.get_permitted_files(user)

    # 4. Generate AI response using QA engine
    try:
        if use_advance_ai:
            chat_history = []
            try:
                from django.db.models import Q
                from chat.models import Message
                recent_msgs = Message.objects.filter(is_group=False).filter(
                    Q(sender=user, target_id='AI_Assistant') | 
                    Q(sender__username='AI_Assistant', target_id=user.username)
                ).order_by('-created_at')[:10]
                
                recent_msgs = reversed(list(recent_msgs))
                for msg in recent_msgs:
                    content = msg.content
                    if is_e2ee and shared_key:
                        try:
                            content = decrypt_aes_gcm(content.encode('utf-8'), shared_key).decode('utf-8')
                        except Exception:
                            pass
                    sender_name = "User" if msg.sender.username != "AI_Assistant" else "AI Assistant"
                    chat_history.append(f"{sender_name}: {content}")
            except Exception as e:
                print("Error fetching chat history:", e)

            reply_text = OllamaLLMEngine.answer_query(
                query=query_plaintext,
                permitted_files=permitted_files,
                attachment_content=attachment_content,
                attachment_name=attachment_name,
                chat_history=chat_history
            )
        else:
            reply_text = LocalQAEngine.answer_query(
                query=query_plaintext,
                permitted_files=permitted_files,
                attachment_content=attachment_content,
                attachment_name=attachment_name
            )
    except Exception as e:
        reply_text = f"An error occurred in the AI Assistant processing engine: {str(e)}"

    # 5. Encrypt response if E2EE
    encrypted_reply = reply_text
    if is_e2ee and shared_key:
        try:
            encrypted_reply = encrypt_aes_gcm(reply_text.encode('utf-8'), shared_key)
        except Exception:
            pass

    return {
        'reply_text': reply_text,
        'encrypted_reply': encrypted_reply,
        'is_e2ee': is_e2ee
    }
