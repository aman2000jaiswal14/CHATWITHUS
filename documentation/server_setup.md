# Server Setup & Deployment Guide

This guide explains how to set up the chat application from scratch. 

> [!NOTE]
> Throughout this project, the directory **"Main Application"** refers to a 3rd-party Django application used as a test harness to demonstrate the integration of the chat module. You can replace this with your own Django, React, or other framework-based application.

## Prerequisites
Ensure the following are installed on your system:
- **Python 3.12+**
- **Node.js 18+** & **npm**
- **Redis Server** (Optional for local dev, mandatory for production/real-time scaling).

---

## Step 1: Backend Setup (Django)

1. **Navigate to the Backend Directory**:
   ```bash
   cd "Main Application"
   ```

2. **Create a Virtual Environment**:
   ```bash
   python3 -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```

3. **Install Core Dependencies**:
   ```bash
   pip install django channels daphne protobuf asgiref channels-redis
   pip install -r requirements.txt
   ```

4. **Database Configuration**:
   The app uses the Django ORM. To initialize the chat-specific tables:
   ```bash
   python manage.py makemigrations chat
   python manage.py migrate
   ```

5. **Create a Superuser** (To access the admin panel and test groups):
   ```bash
   python manage.py createsuperuser
   ```

6. **Run the Development Server**:
   ```bash
   python manage.py runserver 0.0.0.0:8000
   ```
   *Note: This starts Daphne automatically to handle WebSocket connections.*

---

## Step 2: Frontend Setup (React)

1. **Navigate to the Frontend Directory**:
   ```bash
   cd ../frontend
   ```

2. **Install Packages**:
   ```bash
   npm install
   npm audit fix
   ```

3. **Build for Production**:
   This generates a single `widget.js` file optimized for deployment.
   ```bash
   npm run build
   ```

4. **Deploy to Static Assets**:
   Copy the built file into the Django static directory so the backend can serve it.
   ```bash
   npm install --save-dev javascript-obfuscator
   cd ..
   ./generate_frontend.sh
   ```
   or
   ```bash
   cp dist/widget.js "../Main Application/static/chat/widget.js"
   ```

---

## Step 3: Host Identity Authentication Keys (Asymmetric RSA-2048)

WCA Secure Chat uses an **Asymmetric RSA (RS256)** identity assertion model. The 3rd-party Host Application holds the **Private Key** to sign user login assertions, and the Chat Server holds the corresponding **Public Key** to verify them.

### 1. Key Generation Code

You can generate the 2048-bit RSA keypair using either **OpenSSL** or a standalone **Python script**.

#### Option A: Using OpenSSL (CLI)
Run these commands in your terminal:
```bash
# 1. Generate 2048-bit RSA Private Key (PKCS#8 format)
openssl genpkey -algorithm RSA -out host_private_key.pem -pkeyopt rsa_keygen_bits:2048

# 2. Extract the Public Key in PEM format
openssl rsa -pubout -in host_private_key.pem -out host_public_key.pem
```

#### Option B: Using Python Script (`generate_keys.py`)
Run this Python snippet to generate both PEM files automatically:
```python
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

# 1. Generate 2048-bit Private Key
private_key = rsa.generate_private_key(
    public_exponent=65537,
    key_size=2048
)

# 2. Export Private Key in PEM (PKCS#8) format
private_pem = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)
with open("host_private_key.pem", "wb") as f:
    f.write(private_pem)

# 3. Export Public Key in PEM (SubjectPublicKeyInfo) format
public_pem = private_key.public_key().public_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PublicFormat.SubjectPublicKeyInfo
)
with open("host_public_key.pem", "wb") as f:
    f.write(public_pem)

print("RSA Keypair generated successfully: host_private_key.pem & host_public_key.pem")
```

### 2. File Placement & Deployment

| Key File | Target Server / Application | Target Location | Permissions |
| :--- | :--- | :--- | :--- |
| **`host_private_key.pem`** | **Host Application** (Flask / Spring Boot / Node) | `<host_app>/keys/host_private_key.pem` | `chmod 600` (Strictly secret! Never commit to public git) |
| **`host_public_key.pem`** | **Chat Server** (Django) | `Main Application/keys/host_public_key.pem` | `chmod 644` (Safe to distribute) |

> [!IMPORTANT]
> The private key **NEVER** leaves the Host backend. The chat server only ever needs the public key.

### 3. Generate Secure Django `SECRET_KEY`
Never use the default or sample Django secret key in production. Generate a random 50-character secret:
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(50))"
```
Place this into `Main Application/.env`:
```env
SECRET_KEY=your_generated_secret_key_here
```

---

## Step 4: Global Configuration (Host Application)

The chat widget expects a configuration object to be present in the HTML or DOM of the host application. Your host backend must inject an **`IDENTITY_TOKEN`** (RS256 JWT assertion signed with `host_private_key.pem`):

```html
<script>
    window.CHAT_CONFIG = {
        USER_ID: "current_username",             // Logged-in user on Host system
        IDENTITY_TOKEN: "eyJhbGciOiJSUzI1NiIs...", // 5-minute RS256 JWT assertion signed by Host private key
        API_BASE_URL: "https://chat.example.com",
        WS_URL: "wss://chat.example.com/ws/chat/current_username/"
    };
</script>
```

#### JWT Assertion Payload Expected by Chat Server:
- `sub`: The authenticated username (must match `USER_ID`).
- `iss`: Issuer identifier of the host application (e.g. `flasktest` or `my_app`).
- `aud`: Must be `"chatwithus"`.
- `exp`: Expiration timestamp (e.g. `now + 300` seconds; chat server allows 60s leeway for clock drift).
- `jti`: Unique UUID nonce to prevent replay attacks (cached for 10 minutes).

### Configuring Token Expiration & Clock Drift Leeway (Lagger)

To adjust the token lifespan (e.g., reducing the private-key-signed identity token from 5 minutes to 30 seconds) and the clock drift tolerance ("lagger") to 30 seconds:

#### 1. Where to Change Private Key Identity Token Expiry (5 min ➔ 30 seconds):
This setting lives strictly on your **Host Application** backend (the issuer holding `host_private_key.pem`):
- **Flask Host Application**:
  - **File**: `flasktest/app.py`
  - **Function**: `api_chat_config()` (line ~143)
  - **Edit**:
    ```python
    # Change:
    "exp": now + 300,   # 5 minutes
    # To:
    "exp": now + 30,    # 30 seconds
    ```
- **Java / Spring Boot Host Application**:
  - **File**: `ChatTokenService.java` (Reference: `SWDOCS/React_Java_Integration_Guide.md` Section 3.B & Section 7)
  - **Method**: `generateIdentityToken(String username)` (line ~153)
  - **Edit**:
    ```java
    // Change (5 minutes / 300 seconds):
    Instant expiry = now.plusSeconds(300);

    // To (30 seconds):
    Instant expiry = now.plusSeconds(30);
    ```
- **React Frontend Application (`ChatWidget.jsx`)**:
  - **Changes Required**: **None!**
  - **Why**: The React client does not hardcode token durations. It delegates all token acquisition to the `getFreshIdentityToken()` callback via Java's `/api/chat/config`. When the token expires, it automatically queries Java for a fresh 30-second token without breaking the session.

#### 2. Where to Change Clock Drift Leeway / Lagger (60 seconds ➔ 30 seconds):
This setting lives on the **Chat Server** (Django backend):
- **File**: `Main Application/chat/services/auth.py`
- **Function**: `verify_host_identity_token(identity_token)` (line ~59)
- **Edit**:
  ```python
  # Change:
  leeway=60   # 60s clock drift tolerance
  # To:
  leeway=30   # 30s clock drift tolerance
  ```
- **Optional Cache Nonce Timeout**: In the same file (`auth.py`, line ~74):
  ```python
  # When token expiry is reduced to 30s + 30s lagger, the anti-replay nonce cache timeout
  # can be safely reduced from 600s to 120s:
  cache.set(nonce_cache_key, 1, timeout=120)
  ```

---

## Step 5: Troubleshooting Common Issues

### "Chat Vanishes on Refresh"
- **Check**: Ensure `python manage.py migrate` was run.
- **Check**: Verify the `api/history/` endpoint is returning data (check browser console network tab).

### "WebSockets Failing to Connect"
- **Check**: If using a Load Balancer (Nginx/Apache), ensure it is configured to upgrade the connection to `websocket`.
- **Check**: Ensure the `WS_URL` in `CHAT_CONFIG` matches your server's host and protocol (ws vs wss).

### "Styles are Broken"
- **Check**: Ensure your host page doesn't have CSS that conflicts with the widget's Shadow DOM or styling classes.
