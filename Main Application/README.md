# WCA Secure Sovereign Chat - Main Application

## How to Run

### 1. Activate Virtual Environment
```bash
cd "Main Application"
source venv/bin/activate
```

### 2. Run Migrations (first time only)
```bash
python3 manage.py migrate
```

### 3. Create Test Users (first time only)
```bash
python3 manage.py createsuperuser
# Create additional users via /accounts/register/ in the browser
```

### 4. Start the Server
```bash
python3 manage.py runserver 0.0.0.0:8000
```

### 5. Use the Chat
1. Open `http://127.0.0.1:8000/accounts/login/`
2. Login with your credentials
3. You will land on the Dashboard
4. Click the **green chat bubble** (bottom-right corner) to open the Sovereign Chat
5. The chat automatically shows all registered users as contacts
6. Click a contact to start a 1-to-1 conversation
7. Click a Tactical Group to join a group channel

---

## How the Plug-and-Play Auth Bridge Works

The Chat Widget is a pre-compiled React application (`static/chat/widget.js`) that is completely self-contained inside a **Shadow DOM**. It knows nothing about the host application until the host injects a `window.CHAT_CONFIG` object.

### The Auth Bridge Contract

The host application's template must inject the following into the page **before** loading the widget script:

```html
<script>
    window.CHAT_CONFIG = {
        USER_ID: "logged_in_username",      // Unique identifier
        USER_NAME: "Display Name",          // For UI display
        USER_ROLE: "user",                  // "admin", "manager", "user"
        API_USERS_URL: "/accounts/api/users/", // REST endpoint for user list
        WS_URL: "ws://host:port/ws/chat/username/",  // WebSocket endpoint
    };
</script>
<script type="module" src="/path/to/widget.js"></script>
```

### How the Widget Discovers Users

On mount, the React widget calls `fetch(CHAT_CONFIG.API_USERS_URL)` which returns:

```json
{
    "users": [
        { "id": 1, "username": "lt_chen", "name": "LT. R. Chen", "role": "user" },
        { "id": 2, "username": "gen_vogel", "name": "GEN. K. Vogel", "role": "admin" }
    ],
    "current_user": {
        "id": 3, "username": "capt_rossi", "name": "CAPT. M. Rossi", "role": "manager"
    }
}
```

The widget populates its Sidebar contacts from this response. **No hardcoded users exist in the widget.**

### Embedding in Other Frameworks

| Framework | How to Embed |
|-----------|-------------|
| **Django Template** | `<script>` tag + `window.CHAT_CONFIG` (already done) |
| **React App** | Import `widget.js` as a `<script>` in `index.html`, set `window.CHAT_CONFIG` before React mounts |
| **Angular / Vue** | Same pattern: set `window.CHAT_CONFIG` in `index.html`, load `widget.js` |
| **Static HTML** | Copy `widget.js` to your server, add `<div id="root">` + the config script |

The widget **never conflicts** with the host's CSS because it renders inside a Shadow DOM boundary.
