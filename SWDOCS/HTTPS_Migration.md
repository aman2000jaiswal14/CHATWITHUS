# WCA Secure Chat - HTTP vs HTTPS Deployment Guide

This document outlines how to switch the WCA Secure Chat environment between standard HTTP (`ws://`) and secure HTTPS (`wss://`) modes.

## Overview
The protocol setup now works in two parts:
1. **Backend (Main Application)**: Controlled by the `USE_HTTPS` flag directly inside `core/settings.py`.
2. **Host Application (Flask/React)**: Controlled by explicitly defining `https://` / `http://` and `wss://` / `ws://` inside the `window.CHAT_CONFIG` of your frontend template.

---

## 🔒 Running in Secure Mode (HTTPS / WSS)

### 1. Generating Certificates (Handled Automatically)
We provide a helper script that automatically generates a self-signed RSA-2048 certificate (`localhost.crt` and `localhost.key`) if they do not exist.

### 2. Starting the Backend (Django/Daphne)
Navigate to the `Main Application` directory and run the secure script. This script automatically activates the virtual environment, sets the environment variable to `True`, generates the certs, and starts the Daphne server with SSL bindings.

```bash
cd "Main Application"
./run_ssl_dev.sh
```

### 3. Starting the Host (Flask)
Navigate to the `flasktest` directory, activate the environment, and run the app. Ensure `dashboard.html` is configured with `https://` and `wss://`.

```bash
cd flasktest
source venv/bin/activate
python3 app.py
```

### 4. Bypassing Browser Security for Localhost
Because the certificate is self-signed, browsers will forcefully block the `wss://` connection.
1. Open a new tab and go to the backend API: `https://localhost:8000/chat/api/settings/mute/`
2. Click **Advanced** -> **Proceed to localhost (unsafe)**.
    - *Pro Tip*: In Chrome, you can blindly type `thisisunsafe` on the warning page.
3. Refresh your Flask app (`http://localhost:5000`).

---

## 🔓 Running in Standard Mode (HTTP / WS)

Use this mode for traditional local development, testing, or if an external proxy (like Nginx) is already handling HTTPS termination.

### 1. Starting the Backend (Django/Daphne)
Run the standard Django development server. It defaults to `USE_HTTPS=False`.

```bash
cd "Main Application"
source venv/bin/activate
python3 manage.py runserver 0.0.0.0:8000
```

### 2. Starting the Host (Flask)
Ensure your `dashboard.html` is configured with `http://` and `ws://` before starting.

```bash
cd flasktest
source venv/bin/activate
python3 app.py
```

### 3. Local Network / Cross-Device Testing (Important)
If you run the Flask app on a network IP (e.g., `http://10.x.x.x:5000`) instead of `127.0.0.1`, the browser will immediately disable cryptographic functions (`window.crypto.subtle`) because it's an insecure context. You will get a **TypeError: Cannot read properties of undefined (reading 'importKey')** error.

**Option 1: The Browser Bypass (Recommended for Quick Testing)**
1. Open Google Chrome on the client device.
2. Go to `chrome://flags/#unsafely-treat-insecure-origin-as-secure`
3. Add your Flask IP URL (e.g., `http://10.x.x.x:5000`) to the text box.
4. Set the dropdown to **Enabled** and click Relaunch.
The browser will now treat your network IP as secure, allowing the local chat widget to run perfectly under HTTP!

**Option 2: Use Adhoc HTTPS in Flask**
Alternatively, install `pyopenssl` and run the Flask host securely: `app.run(host='0.0.0.0', ssl_context='adhoc')` (Then navigate to `https://10.x.x.x:5000`).

---

## Configuration Details

### Backend Configuration (`Main Application/core/settings.py`)
Set the boolean flag directly in your Django settings file:
```python
# HTTPS configuration flag (Switch to False for HTTP/WS)
USE_HTTPS = True
```

### Host Configuration (`flasktest/templates/dashboard.html` or similar)
The host application should explicitly hardcode the `API_BASE_URL` and `WS_URL` to point to the secure endpoints.
```html
<script id="chat-config" type="application/json">
{
    "USER_ID": "user1",
    "API_BASE_URL": "https://your-server",
    "WS_URL": "wss://your-server/chat/ws/chat/user1/",
    "LICENSE_INFO": { /* License Object */ }
}
</script>
```
To switch back to HTTP, simply change `https://` to `http://` and `wss://` to `ws://` in this configuration block.

---

## 🚀 Production Deployment with Nginx Proxy

In a production environment, you should use Nginx to handle SSL termination and proxy traffic to Daphne.

### Nginx Proxy Configuration
Add these blocks to your Nginx `server` configuration. **Note the use of `^~`** to ensure these routes take priority over static file regex blocks.

```nginx
# 1. Chat Media (Unified Prefix)
location ^~ /chatmedia/ {
    proxy_pass https://127.0.0.1:8000; # Point to Daphne
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_ssl_verify off;

    # 🔥 Bulletproof CORS (Dynamic Origin)
    proxy_hide_header 'Access-Control-Allow-Origin';
    add_header 'Access-Control-Allow-Origin' "$http_origin" always;
    add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
    add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
}

# 2. Chat API & WebSockets
location ^~ /chat/ {
    proxy_pass https://127.0.0.1:8000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_ssl_verify off;

    # 🔥 Bulletproof CORS (Dynamic Origin)
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' "$http_origin" always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
        add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRFToken, X-Chat-User' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Content-Length' 0;
        add_header 'Content-Type' 'text/plain; charset=utf-8';
        return 204;
    }
    proxy_hide_header 'Access-Control-Allow-Origin';
    add_header 'Access-Control-Allow-Origin' "$http_origin" always;
    add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS, PUT, DELETE' always;
    add_header 'Access-Control-Allow-Headers' 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-CSRFToken, X-Chat-User' always;
    add_header 'Access-Control-Allow-Credentials' 'true' always;
}
```

### Important Settings
1. **`MEDIA_URL`**: Must be set to `'/chatmedia/'` in `settings.py`.
2. **`USE_HTTPS`**: Must be set to `True` in `settings.py`.
3. **`API_BASE_URL`**: Should point to your host root (e.g., `https://your-server.com`) without a trailing slash.
