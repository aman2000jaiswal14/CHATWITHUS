# WCA Secure Chat - Maintenance Guide

## 1. Log Management
### Backend (Django)
Logs are critical for debugging production issues.
- **Location**: Typically handled by the server's process manager (Systemd/Supervisor).
- **Configuration**: Update `LOGGING` in `settings.py` to rotate logs daily.
- **Important Logs**: Look for `[PROTOBUF ERROR]`, `[WS CONNECTED]`, and `[DB SAVE ERROR]`.

### Frontend (Browser)
- Use standard browser developer tools (F12) to view licensing and encryption logs.
- Search for `[!] Client-side licensing error` or `Encryption failed`.

---

## 2. Database Maintenance
### Backups (SQLite)
If using the default SQLite database:
- Simply copy the `db.sqlite3` file periodically to a secure backup location.
- Ensure the copy is performed when no active writes are happening.

### Backups (PostgreSQL)
If using Postgres in production:
- Use `pg_dump` for daily backups.
```bash
pg_dump -U chat_user chat_db > backup_$(date +%F).sql
```

---

## 3. Security Maintenance
### RSA Key Rotation
To maintain defense-grade security, rotate the RSA keys every 6-12 months.
1. Generate a new key pair in the `CWU/` directory.
2. Update the Private Key on the server (for the license generator).
3. Update the Public Key in `frontend/src/services/LicensingService.js`.
4. Re-issue and sign all active client licenses.

### Secret Key Management
Rotate the `SECRET_KEY` in `settings.py` whenever a security breach is suspected. Note that this will invalidate all active user sessions.

---

## 4. Scaling the Channel Layer
The `InMemoryChannelLayer` is NOT suitable for multiple server instances.
- **Migration**: When scaling to multiple nodes, switch to `RedisChannelLayer`.
- **Monitoring**: Use `redis-cli info` or a monitoring tool (Grafana/Prometheus) to track active channels and message throughput.

## 5. Cleaning Up Attachments
Periodically clear orphaned or old attachments from the `media/chat_attachments/` folder to save disk space.
- **Recommendation**: Create a custom Django management command to delete files older than X days that are not linked to any `Message` object.
