/**
 * KeyStorage utility for CHAT WITH US.
 * Uses native IndexedDB to store and retrieve Web Crypto CryptoKey objects (ECDH keypairs) locally.
 * Storing CryptoKeys directly in IndexedDB avoids exposing raw private keys.
 */

class KeyStorage {
    constructor() {
        this.dbName = "ChatWithUsKeys";
        this.dbVersion = 1;
        this.storeName = "keypair";
        this.db = null;
    }

    _initDB() {
        if (this.db) return Promise.resolve(this.db);
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error("IndexedDB open error:", event);
                reject(event);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
            };
        });
    }

    async saveKeyPair(userId, keyPair) {
        const db = await this._initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], "readwrite");
            const store = transaction.objectStore(this.storeName);
            const request = store.put(keyPair, userId);

            request.onsuccess = () => resolve(true);
            request.onerror = (event) => reject(event);
        });
    }

    async getKeyPair(userId) {
        const db = await this._initDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([this.storeName], "readonly");
            const store = transaction.objectStore(this.storeName);
            const request = store.get(userId);

            request.onsuccess = (event) => resolve(event.target.result || null);
            request.onerror = (event) => reject(event);
        });
    }
}

export const keyStorage = new KeyStorage();
export default keyStorage;
