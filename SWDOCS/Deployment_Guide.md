# WCA Secure Chat - Deployment Guide

## Overview
This guide provides instructions for deploying the full WCA Secure Chat stack in a production or development environment.

## Prerequisites
- **Python**: 3.9+
- **Node.js**: 16+ and npm
- **Redis / Valkey**: For the Django Channels layer.
- **OS**: Linux (recommended) or macOS.

## 1. Backend Setup (Django)

### Environment Setup
```bash
cd "Main Application"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Database Migration
```bash
python3 manage.py migrate
```

### Redis Configuration
Ensure Redis is running on `localhost:6379`. If it's on a different host, update `CHANNEL_LAYERS` in `settings.py`.

### Start the Server (Development)
```bash
python3 manage.py runserver 0.0.0.0:8000
```
*(For production, use `daphne` or `uvicorn` to handle WebSockets).*

## 2. Frontend Setup (React)

### Install Dependencies
```bash
cd frontend
npm install
```

### Development Mode
```bash
npm run dev
```

### Production Build
```bash
npm run build
```
After building, the assets in `dist/` can be served by the Django server (as static files) or a CDN.

## 3. License Generation (Optional)
If you need to generate a new license for a client:
1. Navigate to the `CWU/` directory.
2. Ensure you have the Private Key (`private_key.pem`).
3. Run the generator:
   ```bash
   python3 license_generator.py
   ```
4. Copy the generated `CWULicense.txt` to the appropriate location (e.g., frontend public folder).

## 4. Production Considerations

### SSL/TLS
Always use `HTTPS` for the web application and `WSS` for WebSockets. SSL termination can be handled by Nginx or HAProxy.

### Channel Layer Stability
In a multi-node cluster, ensure all nodes can reach the same Redis/Valkey instance.

### Static File Serving
Run `python3 manage.py collectstatic` in the backend to gather all assets, including the compiled frontend widget, for serving by Nginx.

### Process Management
Use `supervisor` or `systemd` to keep the Django (Daphne/Gunicorn) and Redis processes running and auto-restart on failure.
