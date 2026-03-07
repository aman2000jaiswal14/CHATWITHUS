# WCA Secure Chat - Security Model

## Overview
Security in WCA Secure Chat is multi-layered, focusing on data privacy, integrity, and access control within restricted environments.

## 1. End-to-End Encryption (E2EE)
While the current implementation uses a shared-secret foundation, the architecture is designed for full E2EE.

### Encryption Algorithm
- **Algorithm**: AES-256-GCM (Galois/Counter Mode).
- **Initialization Vector (IV)**: 12-byte random IV prepended to the ciphertext.
- **Authentication**: GCM providing both encryption and integrity (AEAD).

### Key Derivation
- **Mechanism**: PBKDF2 (Password-Based Key Derivation Function 2).
- **Iterations**: 100,000.
- **Hash**: SHA-256.
- **Salt**: `CHATWITHUS_FRONTEND_SALT`.

### Implementation
- Messages are encrypted on the client *before* being wrapped in Protobuf.
- The server receives only the encrypted payload.
- Decryption happens solely on the recipient's client.

## 2. Licensing & Access Control
A robust licensing system ensures that only authorized instances of the software are operational.

### License Structure
A license is a signed text file (`CWULicense.txt`) containing:
- **Metadata**: Product name, Version, Company, and Issue Date.
- **Constraints**: Expiration Date (`VALID UNTIL`).
- **Signature**: RSA-PSS cryptographic signature.

### Verification Process
1. **Host Loading**: The host application or widget loads the license data.
2. **Signature Check**: The `LicensingService` uses a hardcoded RSA Public Key to verify the signature of the metadata.
3. **Expiration Check**: Validates that the current date is before the `VALID UNTIL` date.
4. **Backend Enforcement**: The Django server can optionally verify the license provided in API headers or stored on the filesystem via `LicenseMiddleware`.

### Cryptographic Details
- **Algorithm**: RSA-PSS.
- **Key Size**: 2048-bit.
- **Hash**: SHA-256.
- **Salt Length**: 32 bytes (standardized across Python and Web Crypto API).

## 3. Data Isolation (Shadow DOM)
The use of **Shadow DOM** provides a security boundary between the chat widget and the host application:
- **CSS Isolation**: Prevent the host application from spying on or manipulating the chat UI via rogue CSS.
- **JS Scoping**: Encapsulates variables and protects the widget from common cross-scripting issues within the host page.

## 4. Bandwidth Security (Protobuf)
Using binary Protobuf instead of JSON makes the data stream less "human-readable" even before encryption, adding a minor layer of obfuscation against simple network sniffing.

## 5. Secure WebSockets
- Connections are established over `wss://` (WebSocket Secure) in production to ensure transport-layer security (TLS).
