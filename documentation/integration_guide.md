# Integration Guide - Embedding the Chat Widget

This guide details exactly which files and libraries are required to integrate the chat module into a 3rd-party application.

## 1. Required Files & Paths (from `WCAA/` root)

### Frontend Core
- **Compiled Widget**: `Main Application/static/chat/widget.js` (This is the single-file React app).
- **Protobuf Schema**: `Main Application/chat/protocols/messages.proto` (Required if rebuilding the frontend or building custom clients).

### Backend Chat App (Django)
If you are integrating into a Django-based 3rd party app, you need to copy the entire `chat/` folder:
- **Path**: `Main Application/chat/`
- **Key Files**: 
  - `models.py`: Database schema for messages, groups, and status.
  - `consumers.py`: WebSocket logic.
  - `views.py`: REST API endpoints.
  - `protocols/messages_pb2.py`: Compiled Python Protobuf handlers.

## 2. Required Libraries & Dependencies

### Python (Backend)
Install these via `pip` in your 3rd-party server:
- `django-channels`: For WebSocket support.
- `daphne`: The ASGI server.
- `protobuf`: For binary serialization.
- `channels-redis`: For real-time scaling (production only).

### Node.js (Frontend - Only if rebuilding)
- `zustand`: State management.
- `lucide-react`: Icons.
- `protobufjs`: Binary encoding.
- `tailwindcss`: Styling.

---

## 3. Platform-Specific Integration Steps
### Django (Primary Host)
Integrating with a Django app is seamless as the backend logic is already in Django.
1. **Include Script**:
   ```html
   <script src="{% static 'chat/widget.js' %}"></script>
   ```
2. **Setup Global Config**:
   ```html
   <script>
       window.CHAT_CONFIG = {
           USER_ID: "{{ request.user.username }}",
           CSRF_TOKEN: "{{ csrf_token }}",
           WS_URL: "ws://" + window.location.host + "/ws/chat/{{ request.user.username }}/"
       };
   </script>
   ```

### React / Vite
If your host is a React application, you can either:
- **Embed as a script**: Same as the Generic JS method below.
- **Import Components**: If both projects share the same repository, you can import and render `<App />` directly, ensuring you wrap it in the required context providers (if any).

### Generic JS / Other Frameworks (Spring, Flask, etc.)
To integrate with non-Django backends, the host must:
1. **Proxy WebSockets**: Route `/ws/chat/` to the running Django Channels server.
2. **Expose Auth APIs**: The Django server needs to be able to authenticate the user (e.g., via a shared JWT or session cookie).
3. **Configuration**:
   ```javascript
   window.CHAT_CONFIG = {
       USER_ID: "dynamic_user_id",
       CSRF_TOKEN: "server_provided_token",
       WS_URL: "wss://chat.yourdomain.com/ws/chat/userId/"
   };
   ```

---

## 3. Protocol Compatibility (Protobuf)

If you are building a custom client (e.g., a native mobile app) to talk to the chat backend:
- **Protocol Definition**: Use the `messages.proto` file to generate client code in your target language (Java, Swift, Go, etc.).
- **Message Wrapping**: Ensure all chat messages are wrapped in the `ProtocolWrapper` message type.
- **JSON Fallbacks**: Be prepared to handle JSON messages for system signals like `presence_update` and `group_refresh`.

---

## 4. Key Integration Requirements
- **Session Sharing**: The chat widget relies on the host application's session management to identify the user.
- **Port Visibility**: Port `8000` (or your chosen daphne port) must be accessible or reverse-proxied by Nginx.
- **CSRF**: The host MUST provide a CSRF token if the user is expected to perform actions like creating groups or joining them.
