import os
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend

class EncryptionService:
    """
    A foundational encryption service for WCA Secure Sovereign Chat.
    In a full implementation, this would handle the Double Ratchet (Signal) Protocol.
    Currently implements AES-256-GCM for payload encryption.
    """
    def __init__(self, key: bytes = None):
        # In practice, keys would be derived from the Double Ratchet session
        self.key = key or os.urandom(32) 

    def encrypt_payload(self, data: bytes) -> tuple[bytes, bytes, bytes]:
        """
        Encrypts a binary payload using AES-256-GCM.
        Returns: (ciphertext, nonce, tag)
        """
        nonce = os.urandom(12)
        cipher = Cipher(
            algorithms.AES(self.key),
            modes.GCM(nonce),
            backend=default_backend()
        )
        encryptor = cipher.encryptor()
        ciphertext = encryptor.update(data) + encryptor.finalize()
        return ciphertext, nonce, encryptor.tag

    def decrypt_payload(self, ciphertext: bytes, nonce: bytes, tag: bytes) -> bytes:
        """
        Decrypts a binary payload using AES-256-GCM.
        """
        cipher = Cipher(
            algorithms.AES(self.key),
            modes.GCM(nonce, tag),
            backend=default_backend()
        )
        decryptor = cipher.decryptor()
        return decryptor.update(ciphertext) + decryptor.finalize()

# Singleton for service access
encryption_service = EncryptionService()
