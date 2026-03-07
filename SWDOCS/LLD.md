# WCA Secure Chat - Low-Level Design (LLD)

## 1. Backend: `ChatConsumer` Component
The `ChatConsumer` (in `consumers.py`) is the primary interface for real-time logic.

### State Variable Breakdown
- `self.user_id`: Unique identifier from the connection URL.
- `self.personal_group`: `user_{user_id}` used for receiving direct messages and presence.
- `self.joined_groups`: A `set()` of group IDs the user is currently subscribed to in Redis.

### Logic Flow for `receive(bytes_data)`
1. **Unwrap**: `wrapper.ParseFromString(bytes_data)`.
2. **Type Check**: Check `HasField('chat_message')`, `HasField('command')`, or `HasField('presence')`.
3. **Handle Chat**:
    - Assign `received_at` (server time).
    - Call `self.message_handler.handle(message)`.
    - Persist to DB using `database_sync_to_async`.
    - Determine `target_group` (either user-specific or group-specific).
    - `channel_layer.group_send(target_group, {'type': 'chat.message', 'data': encoded_binary})`.
4. **Handle Command**:
    - If `SUBSCRIBE_GROUP`: `channel_layer.group_add(target_group, self.channel_name)`.
5. **Handle Presence**:
    - Update `UserStatus` in DB.
    - Broadcast to all bookmarked contacts.

## 2. Frontend: `EncryptionService` Detail
Located in `services/EncryptionService.js`, using the Web Crypto API.

### Key Derivation Logic (`_deriveKey`)
```javascript
// 1. Import raw secret as PBKDF2 key material
// 2. Derive AES-GCM 256 key using:
//    - Salt: 'CHATWITHUS_FRONTEND_SALT'
//    - Iterations: 100,000
//    - Hash: SHA-256
```

### Encryption Function Logic (`encrypt`)
1. Generate a random 12-byte `iv = window.crypto.getRandomValues(new Uint8Array(12))`.
2. `crypto.subtle.encrypt({ name: "AES-GCM", iv: iv }, key, plaintext_bytes)`.
3. Concatenate `iv` + `ciphertext_bytes`.
4. Return Base64 encoded result.

## 3. Frontend: `useChatStore` (Zustand)
Manages the reactive state of the application.

### Store Structure
```javascript
{
  messages: { 'chatId': [MessageObject] },
  activeChat: { id: string, type: 'dm'|'group' },
  unreadCounts: { 'chatId': number },
  onlineUsers: Set(['user1', 'user2']),
  
  // Actions
  addMessage: (chatId, msg) => { ... },
  markRead: (chatId) => { ... },
  setOnline: (userId, isOnline) => { ... }
}
```

## 4. Protobuf Envelope Hierarchy
How data is structured for transmission.

```text
ProtocolWrapper (oneof)
├── ChatMessage
│   ├── message_id (string)
│   ├── sender_id (string)
│   ├── target_id (string)
│   ├── type (enum: TEXT, PTT, etc.)
│   ├── payload (bytes) <-- Encrypted AES-GCM data
│   ├── sent_at (int64)
│   └── Attachment (sub-message)
├── Presence
│   ├── user_id (string)
│   └── status (enum: ONLINE, AWAY, etc.)
└── Command
    ├── type (enum: SUBSCRIBE, UNSUBSCRIBE)
    └── target_id (string)
```
