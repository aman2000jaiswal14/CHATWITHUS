# WCA Secure Chat - Configuration Guide

## 1. App / Widget Name
### Frontend (Widget)
To change the internal name of the widget (used during the build process and internal referencing):
- Locate `frontend/vite.config.js`.
- Modify the `lib.name` and `lib.fileName` fields.
```javascript
lib: {
  entry: 'src/main.jsx',
  name: 'NewAppName',
  formats: ['iife'],
  fileName: () => 'NewAppName.js',
},
```

### Backend (Django)
The project name is currently `core`. Standard Django renaming procedures apply if you wish to change the project folder name.

---

## 2. Max Upload Size
The system is configured to handle file uploads (attachments).
- Locate `Main Application/core/settings.py`.
- Modify the following values (currently set to 50MB):
```python
# 50MB Upload Limits
DATA_UPLOAD_MAX_MEMORY_SIZE = 52428800
FILE_UPLOAD_MAX_MEMORY_SIZE = 52428800

# Global Message Expiration Policy (Module 1)
# Default: 86400 seconds (24 hours)
GLOBAL_MESSAGE_EXPIRATION_SECONDS = 86400
```
- **Note**: This policy applies to all messages unless overridden by a per-message custom timer (licensed).

---

## 3. Static & Media Paths
To change where the system looks for or stores files:
- Locate `Main Application/core/settings.py`.
### Static Files (CSS/JS)
```python
STATIC_URL = 'static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
```
### Media Files (Attachments)
```python
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'
```

---

## 4. Database Configuration
By default, the system uses SQLite for simplicity.
- Locate `Main Application/core/settings.py`.
- To switch to **PostgreSQL**:
```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'your_db_name',
        'USER': 'your_db_user',
        'PASSWORD': 'your_password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

---

## 5. Licensing Configuration
The licensing system is enforced both on the client and the server.
### Client-Side (Frontend)
- The public key is hardcoded in `frontend/src/services/LicensingService.js` as `PUBLIC_KEY_PEM`.
- The widget expects a `CWULicense.txt` in its execution context (or defined via API).

### Server-Side (Backend)
- Enforcement is handled by `chat.middleware.LicenseEnforcementMiddleware`.
- To disable license checks for development, remove this line from `MIDDLEWARE` in `settings.py`.

---

## 6. Real-time Communication (Redis)
The system uses Django Channels.
- **In-Memory (Development)**:
```python
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}
```
- **Redis (Production)**:
```python
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
        },
    },
}
```

---

## 7. Security & CORS
To allow integration from specific domains:
- Locate `Main Application/core/settings.py`.
- Update `CSRF_TRUSTED_ORIGINS` and `CORS_ALLOW_ALL_ORIGINS`.
```python
CORS_ALLOW_ALL_ORIGINS = True # Set to False and use CORS_ALLOWED_ORIGINS for production
CSRF_TRUSTED_ORIGINS = [
    "http://your-host-app.com",
]
```
