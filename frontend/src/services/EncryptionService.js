/**
 * EncryptionService for CHAT WITH US.
 * Uses Web Crypto API to provide AES-256-GCM encryption/decryption.
 * 
 * Encryption model:
 *   - Data is encrypted at rest (stored as ciphertext in the DB)
 *   - Data is encrypted in transit (ciphertext travels over WebSocket/HTTPS)
 *   - Keys are derived deterministically via PBKDF2 from conversation identity
 *     (sorted usernames for DMs, group ID for groups) so that any authenticated
 *     session on any browser/device can always decrypt all messages.
 */

import { useChatStore } from '../store/useChatStore';

const STATIC_SECRET_FOUNDATION = "CHATWITHUS_V1_SECRET_KEY_FOUNDATION";

class EncryptionService {
    constructor() {
        this._keyCache = {}; // Cached derived AES keys (both DM and group)
    }

    /**
     * Pre-warm key derivation. Called early in the app lifecycle.
     */
    async preDeriveKey(userId) {
        // No-op warmup — keys are derived lazily and cached on first use.
    }

    /**
     * Initialize the encryption service. With deterministic keys,
     * there is no keypair to generate or upload — this is a no-op kept
     * for API compatibility with callers that still call initialize().
     */
    async initialize(userId) {
        // No-op — deterministic keys need no per-user initialization.
    }

    /**
     * Derive a deterministic AES-256-GCM key for a group conversation.
     * Salt = "CHATWITHUS_GROUP_SALT_{groupId}"
     */
    async _deriveGroupKey(groupId) {
        const cacheKey = `group:${groupId}`;
        if (this._keyCache[cacheKey]) return this._keyCache[cacheKey];

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
        this._keyCache[cacheKey] = key;
        return key;
    }

    /**
     * Derive a deterministic AES-256-GCM key for a DM conversation.
     * The two usernames are sorted alphabetically so that both parties
     * always derive the exact same key, regardless of who is sender/receiver.
     * Salt = "CHATWITHUS_DM_SALT_{userA}_{userB}" (sorted)
     */
    async _deriveDMKey(partnerUsername, myUserId) {
        // Sort usernames so both sides produce the same salt
        const sorted = [myUserId.toLowerCase(), partnerUsername.toLowerCase()].sort();
        const cacheKey = `dm:${sorted[0]}:${sorted[1]}`;
        if (this._keyCache[cacheKey]) return this._keyCache[cacheKey];

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
                salt: encoder.encode(`CHATWITHUS_DM_SALT_${sorted[0]}_${sorted[1]}`),
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            false,
            ["encrypt", "decrypt"]
        );
        this._keyCache[cacheKey] = key;
        return key;
    }

    _isE2EEnabled() {
        return window.CHAT_F_VERIFIED_MODULES && window.CHAT_F_VERIFIED_MODULES.includes('E2E');
    }

    async encrypt(plaintext, targetId = null, isGroup = null) {
        if (!plaintext) return "";
        if (!this._isE2EEnabled()) return plaintext; // Bypass E2E if unlicensed

        try {
            const state = useChatStore.getState();
            const actualTarget = targetId || state.activeChatId;
            const actualIsGroup = isGroup !== null ? isGroup : state.isGroupChat;
            const myUserId = window.CHAT_F_CONFIG?.USER_ID || state.currentUser;

            if (!actualTarget) return plaintext;
            if (actualTarget === 'AI_Assistant') return plaintext;

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
            const myUserId = window.CHAT_F_CONFIG?.USER_ID || state.currentUser;

            if (!actualTarget) return ciphertextBase64;
            if (actualTarget === 'AI_Assistant' || actualSender === 'AI_Assistant') return ciphertextBase64;

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
            // Determine if this was genuine ciphertext that we failed to decrypt
            // (legacy ECDH-era message) vs. plaintext that was never encrypted.
            const looksLikeCiphertext = /^[A-Za-z0-9+/=]{20,}$/.test(ciphertextBase64.trim());
            if (looksLikeCiphertext) {
                return "\u{1F512} This message can\u2019t be decrypted (encrypted with a previous key)";
            }
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
            const myUserId = window.CHAT_F_CONFIG?.USER_ID || state.currentUser;

            if (!actualTarget) return buffer;
            if (actualTarget === 'AI_Assistant') return buffer;

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
            const myUserId = window.CHAT_F_CONFIG?.USER_ID || state.currentUser;

            if (!actualTarget) return buffer;
            if (actualTarget === 'AI_Assistant' || actualSender === 'AI_Assistant') return buffer;

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

