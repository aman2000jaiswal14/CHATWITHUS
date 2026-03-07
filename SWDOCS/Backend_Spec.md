# WCA Secure Chat - Backend Specification

## Overview
The backend is built using Django and Django Channels, serving as a high-performance message broker and persistence layer. It is designed to handle binary-only communication using Protocol Buffers.

## Project Structure
- `Main Application/`: The core Django project.
- `Main Application/chat/`: The primary app handling messaging logic.
- `Main Application/chat/consumers.py`: WebSocket consumer for multiplexed communication.
- `Main Application/chat/protocols/`: Contains `.proto` definitions and generated Python classes.
- `Main Application/chat/models.py`: Database schema for messages, groups, and status.

## Protocol Buffers (Protobuf)
The system uses a unified `ProtocolWrapper` to encapsulate different types of messages.

### `messages.proto`
- **`ChatMessage`**: Core message type for DMs and Groups. Contains `message_id`, `sender_id`, `target_id`, `payload` (encrypted), and `attachment` metadata.
- **`Presence`**: Handles user status updates (Online, Away, etc.).
- **`Command`**: Handles client-side actions like `SUBSCRIBE_GROUP` and `UNSUBSCRIBE_GROUP`.
- **`ProtocolWrapper`**: Uses a `oneof` field to wrap `ChatMessage`, `Presence`, or `Command`.

## WebSocket Communication
- **Endpoint**: `ws://chat/{user_id}/`
- **Encoding**: All data sent and received over WebSockets is in binary format (Uint8Array/bytes).
- **Consumer Logic (`ChatConsumer`)**:
    - **`connect`**: Authenticates the user and joins their personal group `user_{user_id}`. Broadcasts "Online" status.
    - **`receive`**: Parses incoming binary data into a `ProtocolWrapper`.
    - **`chat_message` handle**: 
        - Extracts message metadata.
        - Persists encrypted payload to `Message` model.
        - Routes to `group_{target_id}` (for groups) or `user_{target_id}` (for DMs).
    - **`command` handle**: Dynamically joins or leaves Redis channel groups.
    - **`disconnect`**: Broadcasts "Offline" status and clears group subscriptions.

## Data Models

### `Message`
- Persists encrypted message content and metadata.
- **Encryption at Rest**: The `save()` method automatically encrypts content before writing to the database using `encryption_service`.
- **Decryption Property**: `decrypted_content` allows server-side decryption if the server holds the necessary keys.

### `ChatGroup`
- Manages group membership and administration.
- Supports many-to-many relationship with `User`.

### `Bookmark`
- Tracks "contacts" for users.
- Used to determine which users should receive presence updates.

### `UserStatus`
- Tracks real-time presence (Online, Away, Sleeping, Working).

### `MessageAttachment`
- Metadata for uploaded files.
- Encrypts `file_name` and `file_type` fields at rest.

## Middlewares & Security
- **Backend License Middleware**: (In `chat/middleware.py`) Can be configured to block API access if a valid license is not present on the server or provided in request headers.
- **Channel Layer**: Uses Redis for reliable message passing between different application instances.
