# WCA Secure Chat - API Reference

## 1. Protobuf Message Structures
All communication over WebSockets uses binary-encoded Protocol Buffers.

### `ProtocolWrapper` (The Envelope)
Users a `oneof` field to handle different message types.
- `chat_message`: Encapsulates a standard message.
- `presence`: Encapsulates user status.
- `command`: Encapsulates system actions.

### `ChatMessage`
- `message_id` (string): UUID for tracking.
- `sender_id` (string): Username of sender.
- `target_id` (string): Recipient username or Group ID.
- `type` (enum): `TEXT(0)`, `PTT(1)`, `BROADCAST_ALERT(2)`, `PRESENCE_UPDATE(3)`, `SYSTEM(4)`.
- `payload` (bytes): AES-GCM encrypted message body.
- `sent_at` (int64): Local timestamp of sender.
- `attachment` (sub-message):
    - `id`, `name`, `type`, `url`, `size`.

### `Presence`
- `user_id` (string): Username.
- `status` (enum): `AVAILABLE(0)`, `AWAY(1)`, `IDLE(2)`, `BUSY(3)`.

### `Command`
- `type` (enum): `SUBSCRIBE_GROUP(0)`, `UNSUBSCRIBE_GROUP(1)`.
- `target_id` (string): Group ID.

---

## 2. WebSocket Events (Server-to-Client)
The server pushes these binary messages to the client.

### `chat.message`
Delivers a wrapped `ChatMessage` or `Presence` update.

### `group_refresh` (JSON)
Sent when the user is added/removed from a group or a group they are in is updated.
- `type`: "group_refresh"
- `reason`: "update" | "added" | "removed"

---

## 3. Internal Frontend Events
Communication between the `WebSocketClient` and the UI.
- `ON_MESSAGE`: Fired when a new chat message is decoded.
- `ON_PRESENCE`: Fired when a contact's status changes.
- `ON_CONNECT`: Fired when the WebSocket is successfully established.
- `ON_DISCONNECT`: Fired when the connection is lost.

---

## 4. Key Security Constrains
- **Maximum Payload Size**: 50MB (controlled by `settings.py` and Protobuf limits).
- **Binary Format**: The client MUST send data as `ArrayBuffer` or `Uint8Array`. JSON is not supported on the main chat socket.
