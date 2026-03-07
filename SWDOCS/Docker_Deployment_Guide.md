# WCA Secure Chat - Docker Deployment Guide

## 1. Overview
Dockerizing the application ensures consistent environments across development and production. The architecture uses four main services:
- **Backend**: Django Channels (ASGI)
- **Frontend**: React (Vite) served via Nginx
- **Database**: PostgreSQL
- **Pub/Sub**: Redis (for backend horizontal scaling)

---

## 2. Prerequisites
- **Docker Engine** (20.10+)
- **Docker Compose** (V2+)

---

## 3. Configuration Files

### A. Backend Dockerfile (`Main Application/Dockerfile`)
Uses a slim Python 3.12 image. It installs system dependencies for PostgreSQL and then installs the Python requirements.

### B. Frontend Dockerfile (`frontend/Dockerfile`)
A multi-stage build:
1.  **Stage 1 (Build)**: Uses Node.js to compile the React widget.
2.  **Stage 2 (Serve)**: Uses a lightweight Nginx image to serve the compiled assets.

### C. Docker Compose (`docker-compose.yml`)
Orchestrates the four services and mounts a persistent volume for the PostgreSQL data.

---

## 4. How to Run

### Step 1: Build and Start
From the root directory:
```bash
docker-compose up --build
```

### Step 2: Initialize Database
Run migrations inside the backend container:
```bash
docker-compose exec backend python manage.py migrate
```

### Step 3: Create Superuser
```bash
docker-compose exec backend python manage.py createsuperuser
```

---

## 5. Environment Variables
You can override default settings by creating a `.env` file in the root directory:

| Variable | Description |
| :--- | :--- |
| `DEBUG` | Set to `1` for development, `0` for production. |
| `DATABASE_URL` | PostgreSQL connection string. |
| `REDIS_URL` | Redis connection string. |

---

## 6. Production Hardening
- **SSL**: Integrate with an external Nginx or Traefik reverse proxy for TLS termination.
- **Resources**: Limit container resources (CPU/RAM) in the `docker-compose.yml` for stability.
- **Persistence**: Ensure `postgres_data` is backed up regularly.
