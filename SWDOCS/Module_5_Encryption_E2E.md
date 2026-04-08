# Module 5: End-to-End Encryption (E2E)

## Overview
The E2E module provides military-grade, client-side encryption for all message content and attachments. It ensures that data is encrypted before it ever leaves the user's device.

## Features
- **Algorithm**: AES-256-GCM (Galois/Counter Mode) for authenticated encryption.
- **Key Derivation**: Uses standard PBKDF2/Argon2 patterns for secure key handling.
- **Zero-Knowledge**: The server never sees plaintext content; it only handles encrypted blobs.
- **Backward Compatibility**: Automatically falls back to plaintext if the module is disabled (not recommended for production).

## Licensing Enforcement
- **Module ID**: `E2E`
- **Gating**:
    - **Prototypes**: The `EncryptionService` bypasses its encryption/decryption routines if the `E2E` identifier is missing from the license.
    - **UI**: Encrypted messages will show as "Ciphertext" or be unreadable if the key/module is missing.
