# WCA Secure Chat - Detailed Deployment Manual (Enterprise)

## 1. Production Architecture
In an enterprise environment, the application is deployed behind a reverse proxy (Nginx) and managed by a process supervisor (Systemd).

---

## 2. Server Prerequisites (Ubuntu 22.04+)
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3-pip python3-venv nginx redis-server supervisor -y
```

---

## 3. Application Setup
1. **Clone & Venv**:
   ```bash
   git clone <repo_url> /opt/chatwithus
   cd /opt/chatwithus/Main\ Application
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt daphne gunicorn
   ```

2. **Environment Variables**:
   Create a `.env` file in `Main Application/core/` (or use system vars):
   ```text
   DEBUG=False
   SECRET_KEY=your-long-random-string
   DATABASE_URL=postgres://user:pass@localhost/dbname
   REDIS_URL=redis://localhost:6379/1
   ```

3. **Static Collection**:
   ```bash
   python3 manage.py collectstatic --noinput
   ```

---

## 4. Systemd Service Configuration
Create `/etc/systemd/system/cwu-backend.service`:

```ini
[Unit]
Description=ChatWithUs ASGI Service (Daphne)
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/opt/chatwithus/Main Application
EnvironmentFile=/opt/chatwithus/Main Application/core/.env
ExecStart=/opt/chatwithus/Main Application/venv/bin/daphne -b 0.0.0.0 -p 8000 core.asgi:application

[Install]
WantedBy=multi-user.target
```

---

## 5. Nginx Reverse Proxy Configuration
Create `/etc/nginx/sites-available/chatwithus`:

```nginx
server {
    listen 80;
    server_name chat.yourdomain.com;

    # Static and Media
    location /static/ {
        alias /opt/chatwithus/Main Application/static_root/;
    }

    location /media/ {
        alias /opt/chatwithus/Main Application/media/;
    }

    # API and WebSockets
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 6. Security Hardening
1. **Firewall (UFW)**:
   ```bash
   sudo ufw allow 'Nginx Full'
   sudo ufw allow 22/tcp
   sudo ufw enable
   ```
2. **Permissions**:
   ```bash
   sudo chown -R www-data:www-data /opt/chatwithus/Main\ Application/media
   sudo chmod -R 755 /opt/chatwithus/Main\ Application/media
   ```

---

## 7. Launch
```bash
sudo systemctl enable cwu-backend
sudo systemctl start cwu-backend
sudo ln -s /etc/nginx/sites-available/chatwithus /etc/nginx/sites-enabled
sudo nginx -t && sudo systemctl restart nginx
```
