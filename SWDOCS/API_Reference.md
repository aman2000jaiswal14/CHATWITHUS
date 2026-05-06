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

---

## 5. Security Enforcements
All API requests and WebSocket connections are subject to the following safeguards:

### Authentication
Every request MUST include a valid JWT in the headers:
`Authorization: Bearer <JWT_TOKEN>`

### New Security Endpoints
| Endpoint | Method | Description | Rate Limit |
| :--- | :--- | :--- | :--- |
| `/chat/api/auth/token/` | POST | Generates a JWT from a username + HMAC signature. | 20/hr |
| `/chat/api/register/` | POST | Registers a new user. | 5/hr |

### File Validation
The `/chat/api/upload/` endpoint only accepts the following extensions:
- `.jpg`, `.png`, `.pdf`, `.docx`, `.xlsx`, `.pptx`, `.csv`, `.xml`, `.json`, `.zip`, `.txt`

### WebSocket Throttling
Outgoing messages are limited to **15 per session**. Exceeding this will result in immediate message rejection and log flagging.
