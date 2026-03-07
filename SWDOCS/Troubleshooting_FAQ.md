# WCA Secure Chat - Troubleshooting & FAQ

## 1. Common Connection Issues

### "WebSocket Connection Failed"
- **Reason**: The Django server is not running or the URL is incorrect.
- **Check**: Ensure `python manage.py runserver` is active. Check that the widget is trying to connect to the correct IP/port (default 8000).
- **SSL**: If the host app is `HTTPS`, the WebSocket MUST be `WSS`.

### "Redis Connection Error" in Backend
- **Reason**: The channel layer cannot reach the Redis/Valkey server.
- **Check**: Ensure Redis is running (`redis-cli ping`). Check `CHANNEL_LAYERS` config in `settings.py`.

---

## 2. Encryption & Security Issues

### "Decryption Error" in UI
- **Reason**: The recipient does not have the correct secret key or the IV is corrupted.
- **Check**: Ensure both clients are using the same `SHARED_SECRET` in `EncryptionService.js` (for base version) or that E2EE key exchange was successful.

### "License Invalid" Error
- **Reason**: The `CWULicense.txt` signature doesn't match the public key or fields were modified.
- **Check**: Ensure the license file hasn't been edited manually. Verify the public key in `LicensingService.js`.

---

## 3. Build & Integration Issues

### "Shadow DOM Styles not loading"
- **Reason**: `index.css` was not properly inlined during the Vite build.
- **Check**: Ensure `vite.config.js` has `inlineDynamicImports: true` and the CSS is correctly imported with `?inline` in `ShadowWrapper.jsx`.

### "Module not found" or "React not defined"
- **Reason**: The host application's environment is conflicting with the widget's module system.
- **Check**: Ensure the widget is loaded with `<script type="module">`.

---

## 4. Frequently Asked Questions (FAQ)

**Q: Can I use this without a license?**
A: For development, you can disable `LicenseEnforcementMiddleware` in Python, but the frontend widget will still require a valid signature unless modified.

**Q: Does it support group video calls?**
A: No. The current architecture is optimized for low-bandwidth binary messaging (Text, PTT, Data).

**Q: Where are the files stored?**
A: Files are stored in the `media/chat_attachments/` directory on the server.
