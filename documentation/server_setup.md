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
   python -m venv venv
   source venv/bin/activate  # On Windows use: venv\Scripts\activate
   ```

3. **Install Core Dependencies**:
   ```bash
   pip install django channels daphne protobuf asgiref channels-redis
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
   ```

3. **Build for Production**:
   This generates a single `widget.js` file optimized for deployment.
   ```bash
   npm run build
   ```

4. **Deploy to Static Assets**:
   Copy the built file into the Django static directory so the backend can serve it.
   ```bash
   cp dist/widget.js "../Main Application/static/chat/widget.js"
   ```

---

## Step 3: Global Configuration

The chat widget expects a configuration object to be present in the HTML of the main application. Ensure your host page includes:

```html
<script>
    window.CHAT_CONFIG = {
        USER_ID: "current_username", // Dynamic from your auth system
        CSRF_TOKEN: "your_django_csrf_token",
        WS_URL: "ws://" + window.location.host + "/ws/chat/current_username/"
    };
</script>
```

---

## Step 4: Troubleshooting Common Issues

### "Chat Vanishes on Refresh"
- **Check**: Ensure `python manage.py migrate` was run.
- **Check**: Verify the `api/history/` endpoint is returning data (check browser console network tab).

### "WebSockets Failing to Connect"
- **Check**: If using a Load Balancer (Nginx/Apache), ensure it is configured to upgrade the connection to `websocket`.
- **Check**: Ensure the `WS_URL` in `CHAT_CONFIG` matches your server's host and protocol (ws vs wss).

### "Styles are Broken"
- **Check**: Ensure your host page doesn't have CSS that conflicts with the widget's Shadow DOM or styling classes.
