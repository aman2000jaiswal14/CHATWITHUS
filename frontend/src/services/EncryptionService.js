/**
 * EncryptionService for CHAT WITH US.
 * Uses Web Crypto API to provide AES-256-GCM encryption/decryption.
 * This provides the foundation for End-to-End Encryption (E2EE).
 */

const SHARED_SECRET = "CHATWITHUS_V1_SECRET_KEY_FOUNDATION"; // In production, this would be derived via ECDH

class EncryptionService {
    async _deriveKey() {
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(SHARED_SECRET),
            "PBKDF2",
            false,
            ["deriveBits", "deriveKey"]
        );
        return window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: encoder.encode("CHATWITHUS_FRONTEND_SALT"),
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
    }

    async encrypt(plaintext) {
        if (!plaintext) return "";
        try {
            const key = await this._deriveKey();
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encoder = new TextEncoder();
            const encrypted = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                key,
                encoder.encode(plaintext)
            );

            // Combine IV + Ciphertext
            const result = new Uint8Array(iv.length + encrypted.byteLength);
            result.set(iv, 0);
            result.set(new Uint8Array(encrypted), iv.length);

            // Base64 encode for transport in Protobuf body (as string)
            return btoa(String.fromCharCode(...result));
        } catch (e) {
            console.error("Encryption failed:", e);
            return plaintext;
        }
    }

    async decrypt(ciphertextBase64) {
        if (!ciphertextBase64) return "";
        try {
            const key = await this._deriveKey();
            const binary = atob(ciphertextBase64);
            const data = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
                data[i] = binary.charCodeAt(i);
            }

            const iv = data.slice(0, 12);
            const ciphertext = data.slice(12);

            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                ciphertext
            );

            return new TextDecoder().decode(decrypted);
        } catch (e) {
            // If decryption fails, it might be an unencrypted message
            return ciphertextBase64;
        }
    }

    async encryptBuffer(buffer) {
        if (!buffer) return null;
        try {
            const key = await this._deriveKey();
            const iv = window.crypto.getRandomValues(new Uint8Array(12));
            const encrypted = await window.crypto.subtle.encrypt(
                { name: "AES-GCM", iv: iv },
                key,
                buffer
            );

            // Combine IV + Ciphertext
            const result = new Uint8Array(iv.length + encrypted.byteLength);
            result.set(iv, 0);
            result.set(new Uint8Array(encrypted), iv.length);
            return result.buffer;
        } catch (e) {
            console.error("Buffer encryption failed:", e);
            return buffer;
        }
    }

    async decryptBuffer(buffer) {
        if (!buffer) return null;
        try {
            const key = await this._deriveKey();
            const data = new Uint8Array(buffer);
            const iv = data.slice(0, 12);
            const ciphertext = data.slice(12);

            const decrypted = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                ciphertext
            );
            return decrypted;
        } catch (e) {
            console.error("Buffer decryption failed:", e);
            return buffer;
        }
    }
}

export const encryptionService = new EncryptionService();
export default encryptionService;
