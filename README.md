# WCA Secure Chat 🛡️

This repository contains the **Defense-Grade, Zero-Cost, Plug-and-Play** messaging platform designed for restricted **1 Mbps isolated networks**.

## Current Features
1. **Binary Protobuf Messaging:** JSON is fully replaced by binary Protobuf schemas for optimal bandwidth on a 1 Mbps pipe.
2. **1-to-1 & Group Chat:** The architecture utilizes a single multiplexed WebSocket `ws://chat/{user_id}/`. The Django server automatically routes messages to the correct Direct recipient or broadcast Group based on the Protobuf envelope.
3. **Shadow DOM frontend:** The React Application is fully encapsulated inside a Web Components Shadow Root. This prevents any CSS or JavaScript leakage, enabling it to be a true "Plug-and-Play" component.
4. **Encryption Foundation:** A singleton `EncryptionService` (currently loaded with AES-256-GCM) is positioned to act as the payload handler before transit.
5. **Real-time State Management:** React uses `zustand` combined with an `Observer` pattern in the `WebSocketClient` class to reactively render messages.

## 🚀 How to Run Locally

### 1. Django Backend
The core broker needs to be running.
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 manage.py runserver 0.0.0.0:8000
```
*(Note: To run in clustered mode across nodes, ensure a Redis/Valkey server is running on `localhost:6379` and update `settings.py`'s `CHANNEL_LAYERS`)*

### 2. React Frontend (Development Mode)
```bash
cd frontend
export NVM_DIR="$HOME/.nvm" && source "$NVM_DIR/nvm.sh"
npm run dev
```
Visit `http://localhost:5173/` to interact with the UI.

---

## 🔌 Plug-and-Play Integration

Because the Frontend is compiled via `Vite` into a single JavaScript file and heavily isolated using the **Shadow DOM**, injecting this Chat Widget into **ANY** other web-application (React, Django Templates, Spring, Angular) is incredibly simple.

### Integration Steps for Host Applications

**Step 1: Build the Widget**
First, compile the frontend for production:
```bash
cd frontend
npm run build
```
This will output a highly optimized Javascript file in `frontend/dist/assets/index-[hash].js`.

**Step 2: Inject into the Host Site**
In your target application (e.g., a Django generic Template or a standard HTML page), you simply need to load that Javascript file and provide an anchor `div`.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Your Legacy Application</title>
</head>
<body>

    <!-- Your existing application content here -->
    <div id="legacy-app-header">Welcome to the Host Platform</div>

    <!-- 1. The Anchor Div where the chat will mount -->
    <div id="root"></div>

    <!-- 2. Import the compiled React Shadow Widget -->
    <script type="module" src="/static/path-to-dist/assets/index-[hash].js"></script>
    
</body>
</html>
```

### Why this works flawlessly (Zero-CSS Conflict):
When the React script executes, it does **not** render standard DOM nodes globally. Instead, it locates the `<div id="root">`, attaches an isolated `#shadow-root (open)`, and renders the entire modern Tailwind interface inside of it. 
No matter what CSS is running on the host application (Bootstrap, generic tags, etc.), the  Chat widget will remain completely shielded and look pixel-perfect.
# CHATWITHUS
