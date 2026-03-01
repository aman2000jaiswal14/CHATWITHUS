# Design Analysis: WCA Secure Sovereign Chat

This document outlines the architectural decisions and design patterns chosen for the WCA Secure Sovereign Chat platform, based on the requirements for scalability, security, and low-bandwidth optimization.

## 1. Architectural Overview
The system follows a **Hybrid State Model**:
- **Stateless Authentication:** JWT-based, issued by the host app.
- **Stateful Messaging:** Persistent WebSockets for efficiency.
- **Local-First Frontend:** IndexedDB for message history and contact search to minimize bandwidth.

## 2. Core Design Patterns

### 2.1. Pub/Sub (Publisher-Subscriber)
- **Layer:** Backend (Django Channels + Valkey)
- **Purpose:** Enables horizontal scaling. Message sent to one Django node is published to Valkey and subscribed to by other nodes where the recipient(s) are connected.
- **Benefit:** Decouples message senders from receivers across distributed nodes.

### 2.2. Observer Pattern
- **Layer:** Frontend (React)
- **Purpose:** The UI "observes" the WebSocket connection. When a new Protobuf message arrives, the UI updates React state (Zustand/Redux) to trigger re-renders.
- **Benefit:** Real-time UI updates without polling.

### 2.3. Strategy Pattern
- **Layer:** Both Backend and Frontend
- **Purpose:** Handling different message types (`TEXT`, `VOICE_PTT`, `BROADCAST_ALERT`).
- **Implementation:**
    - **Backend:** A `MessageHandler` strategy that routes messages to different processing logic (e.g., PTT audio needs encryption and priority queueing).
    - **Frontend:** A `MessageRenderer` strategy that chooses between a text bubble, audio player, or high-priority alert banner.

### 2.4. Singleton Pattern
- **Layer:** Frontend (JavaScript)
- **Purpose:** Ensure a single `WebSocketManager` and `IndexedDBManager` instance.
- **Benefit:** Prevents multiple redundant connections and database locks.

### 2.5. Factory Pattern
- **Layer:** Both
- **Purpose:** Instantiating Protobuf messages.
- **Benefit:** Simplifies the creation of complex binary-serialized objects.

### 2.6. Proxy Pattern (Shadow DOM)
- **Layer:** Frontend (React Widget)
- **Purpose:** Use Shadow DOM to encapsulate the Chat UI.
- **Benefit:** Prevents CSS/JS conflicts when "plugging" the chat into different host applications (Vite, Django, etc.).

### 2.7. Repository Pattern
- **Layer:** Both
- **Purpose:** An abstraction layer for data.
    - **Backend:** `MessageRepository` interacting with Postgres.
    - **Frontend:** `LocalChatRepository` interacting with IndexedDB.
- **Benefit:** Makes it easier to swap storage backends (e.g., if moving from Postgres to another DB) and keeps logic clean.

## 3. Optimization Strategies

### 3.1. Binary Serialization (Protobuf)
Replaces JSON to reduce payload size by up to 70%, crucial for the 1 Mbps bandwidth limit.

### 3.2. Delta-Sync Logic
The `DeltaSyncManager` will implement a logic where the client sends its last known `MessageID`, and the server only sends updates since then.

### 3.3. PTT (Push-To-Talk) Chunking
Voice is sent as "bursts" (Opus codec at 6kbps) to avoid the overhead of a continuous stream, fitting the low-bandwidth constraint.

## 4. Security Implementation
- **Double Ratchet (Signal Protocol):** Implemented via a specialized `EncryptionService`.
- **mTLS:** Handled at the Nginx/Infrastructure layer.
