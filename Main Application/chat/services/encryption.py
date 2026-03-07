import os
import base64
from django.conf import settings
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

class EncryptionService:
    """
    A foundational encryption service for CHAT WITH US.
    Implements AES-256-GCM for payload encryption (At Rest).
    """
    def __init__(self):
        # Derive a consistent 32-byte key from Django's SECRET_KEY
        salt = b'CHATWITHUS_SALT'  # Fixed salt for system-wide consistency
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
            backend=default_backend()
        )
        self.key = kdf.derive(settings.SECRET_KEY.encode())

    def encrypt_payload(self, data: str) -> str:
        """
        Encrypts a string payload using AES-256-GCM.
        Returns: base64 encoded string containing (nonce + tag + ciphertext)
        """
        if not data:
            return ""
        
        nonce = os.urandom(12)
        cipher = Cipher(
            algorithms.AES(self.key),
            modes.GCM(nonce),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(data.encode('utf-8')) + encryptor.finalize()
        
        # Combine nonce, tag, and ciphertext for storage
        combined = nonce + encryptor.tag + ciphertext
        return base64.b64encode(combined).decode('utf-8')

    def decrypt_payload(self, encrypted_base64: str) -> str:
        """
        Decrypts a base64 encoded encrypted payload.
        """
        if not encrypted_base64:
            return ""
            
        try:
            combined = base64.b64decode(encrypted_base64.encode('utf-8'))
            nonce = combined[:12]
            tag = combined[12:28]
            ciphertext = combined[28:]
            
            cipher = Cipher(
                algorithms.AES(self.key),
                modes.GCM(nonce, tag),
                backend=default_backend()
            )
            decryptor = cipher.decryptor()
            decrypted_bytes = decryptor.update(ciphertext) + decryptor.finalize()
            return decrypted_bytes.decode('utf-8')
        except Exception as e:
            # Fallback for old plaintext messages or decryption failure
            return f"[Decryption Error or Plaintext] {encrypted_base64}"

# Singleton for service access
encryption_service = EncryptionService()
