/**
 * EncryptionService for CHAT WITH US.
 * Uses Web Crypto API to provide AES-256-GCM encryption/decryption.
 * This provides true End-to-End Encryption (E2EE) using ECDH for DMs.
 */

import keyStorage from './KeyStorage';
import { uploadPublicKey, fetchPublicKey } from './api';
import { useChatStore } from '../store/useChatStore';

const STATIC_SECRET_FOUNDATION = "CHATWITHUS_V1_SECRET_KEY_FOUNDATION";

class EncryptionService {
    constructor() {
        this._groupKeys = {}; // Cached group keys
        this._sharedKeys = {}; // Cached derived ECDH shared keys for partner usernames
        this._myPrivateKey = null;
        this._myPublicKey = null;
        this._initializationPromise = null;
    }

    async preDeriveKey(userId) {
        const uid = userId || window.CHAT_CONFIG?.USER_ID || useChatStore.getState().currentUser;
        if (!uid || uid === 'anonymous') return;
        
        // Trigger initialization in background - don't await in the caller
        this.initialize(uid).catch(e => console.error("Warmup E2EE initialization failed:", e));
    }

    async initialize(userId) {
        if (!userId || userId === 'anonymous') return;
        if (this._initializationPromise) return this._initializationPromise;

        this._initializationPromise = (async () => {
            try {
                // Try to load keypair from local storage (IndexedDB)
                let keyPair = await keyStorage.getKeyPair(userId);
                if (!keyPair) {
                    // Generate new P-256 ECDH keypair
                    keyPair = await window.crypto.subtle.generateKey(
                        {
                            name: "ECDH",
                            namedCurve: "P-256"
                        },
                        true, // extractable (so we can export public key)
                        ["deriveKey", "deriveBits"]
                    );
                    await keyStorage.saveKeyPair(userId, keyPair);

                    // Export public key to JWK and upload to backend
                    const jwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
                    await uploadPublicKey(JSON.stringify(jwk));
                } else {
                    // Self-healing: verify the public key actually exists on the server.
                    try {
                        const existingKey = await fetchPublicKey(userId);
                        if (!existingKey || !existingKey.public_key_json) {
                            console.log("[E2EE] Public key missing on server. Uploading local key.");
                            const jwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
                            await uploadPublicKey(JSON.stringify(jwk));
                        }
                    } catch (err) {
                        console.warn("[E2EE] Could not verify public key presence on server:", err);
                    }
                }

                this._myPrivateKey = keyPair.privateKey;
                this._myPublicKey = keyPair.publicKey;
            } catch (e) {
                console.error("EncryptionService initialization failed:", e);
                this._initializationPromise = null; // Allow retry on failure
            }
        })();

        return this._initializationPromise;
    }

    async _deriveGroupKey(groupId) {
        if (this._groupKeys[groupId]) return this._groupKeys[groupId];
        
        const encoder = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(STATIC_SECRET_FOUNDATION),
            "PBKDF2",
            false,
            ["deriveBits", "deriveKey"]
        );
        const key = await window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: encoder.encode(`CHATWITHUS_GROUP_SALT_${groupId}`),
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
        this._groupKeys[groupId] = key;
        return key;
    }

    async _deriveDMKey(partnerUsername, myUserId) {
        const cacheKey = `${myUserId}:${partnerUsername}`;
        if (this._sharedKeys[cacheKey]) return this._sharedKeys[cacheKey];

        // Ensure we are initialized
        await this.initialize(myUserId);
        if (!this._myPrivateKey) {
            throw new Error("Cannot derive E2EE key: local private key not initialized");
        }

        // Fetch partner's public key from server
        const keyData = await fetchPublicKey(partnerUsername);
        if (!keyData || !keyData.public_key_json) {
            throw new Error(`Cannot derive E2EE key: recipient ${partnerUsername} has no public key`);
        }

        // Import partner's public key (JWK format)
        const jwk = JSON.parse(keyData.public_key_json);
        const partnerPublicKey = await window.crypto.subtle.importKey(
            "jwk",
            jwk,
            {
                name: "ECDH",
                namedCurve: "P-256"
            },
            true,
            []
        );

        // Perform ECDH key derivation to get a symmetric AES-GCM-256 key
        const derivedKey = await window.crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: partnerPublicKey
            },
            this._myPrivateKey,
            {
                name: "AES-GCM",
                length: 256
            },
            false,
            ["encrypt", "decrypt"]
        );

        this._sharedKeys[cacheKey] = derivedKey;
        return derivedKey;
    }

    _isE2EEnabled() {
        return window.CWU_VERIFIED_MODULES && window.CWU_VERIFIED_MODULES.includes('E2E');
    }

    async encrypt(plaintext, targetId = null, isGroup = null) {
        if (!plaintext) return "";
        if (!this._isE2EEnabled()) return plaintext; // Bypass E2E if unlicensed

        try {
            const state = useChatStore.getState();
            const actualTarget = targetId || state.activeChatId;
            const actualIsGroup = isGroup !== null ? isGroup : state.isGroupChat;
            const myUserId = window.CHAT_CONFIG?.USER_ID || state.currentUser;

            if (!actualTarget) return plaintext;

            let key;
            if (actualIsGroup) {
                key = await this._deriveGroupKey(actualTarget);
            } else {
                key = await this._deriveDMKey(actualTarget, myUserId);
            }

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

    async decrypt(ciphertextBase64, senderId = null, isGroup = null, targetId = null) {
        if (!ciphertextBase64) return "";
        if (!this._isE2EEnabled()) return ciphertextBase64; // Bypass E2E if unlicensed

        try {
            const state = useChatStore.getState();
            const actualIsGroup = isGroup !== null ? isGroup : state.isGroupChat;
            const actualTarget = targetId || state.activeChatId;
            const actualSender = senderId;
            const myUserId = window.CHAT_CONFIG?.USER_ID || state.currentUser;

            if (!actualTarget) return ciphertextBase64;

            let key;
            if (actualIsGroup) {
                key = await this._deriveGroupKey(actualTarget);
            } else {
                const partner = actualSender 
                    ? ((actualSender.toLowerCase() === myUserId.toLowerCase()) ? actualTarget : actualSender)
                    : actualTarget;
                key = await this._deriveDMKey(partner, myUserId);
            }

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

    async encryptBuffer(buffer, targetId = null, isGroup = null) {
        if (!buffer) return null;
        if (!this._isE2EEnabled()) return buffer;
        try {
            const state = useChatStore.getState();
            const actualTarget = targetId || state.activeChatId;
            const actualIsGroup = isGroup !== null ? isGroup : state.isGroupChat;
            const myUserId = window.CHAT_CONFIG?.USER_ID || state.currentUser;

            if (!actualTarget) return buffer;

            let key;
            if (actualIsGroup) {
                key = await this._deriveGroupKey(actualTarget);
            } else {
                key = await this._deriveDMKey(actualTarget, myUserId);
            }

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

    async decryptBuffer(buffer, senderId = null, isGroup = null, targetId = null) {
        if (!buffer) return null;
        if (!this._isE2EEnabled()) return buffer;
        try {
            const state = useChatStore.getState();
            const actualIsGroup = isGroup !== null ? isGroup : state.isGroupChat;
            const actualTarget = targetId || state.activeChatId;
            const actualSender = senderId;
            const myUserId = window.CHAT_CONFIG?.USER_ID || state.currentUser;

            if (!actualTarget) return buffer;

            let key;
            if (actualIsGroup) {
                key = await this._deriveGroupKey(actualTarget);
            } else {
                const partner = actualSender 
                    ? ((actualSender.toLowerCase() === myUserId.toLowerCase()) ? actualTarget : actualSender)
                    : actualTarget;
                key = await this._deriveDMKey(partner, myUserId);
            }

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
