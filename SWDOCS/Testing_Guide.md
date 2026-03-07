# WCA Secure Chat - Testing Guide

## 1. Backend Testing (Django)
The backend uses standard Django testing tools with `pytest` support.

### Running Basic Tests
```bash
cd "Main Application"
source venv/bin/activate
python manage.py test
```

### Coverage
To check how much of your code is covered by tests:
```bash
pip install coverage
coverage run manage.py test
coverage report
```

---

## 2. Frontend Testing (React)
The frontend uses **Vitest** for unit and component testing.

### Running Tests
```bash
cd frontend
npm test
```

### Mocking WebSockets
When testing components that rely on the `WebSocketClient`, ensure you mock the global `WebSocket` object or use a testing library like `mock-socket`.

---

## 3. Manual Verification Steps
To ensure the system is working end-to-end:

1.  **License Check**: Run the app and ensure the toggle button appears. If it doesn't, check for licensing errors in the console.
2.  **Messaging Check**: Open the app in two different browsers (or an incognito window) with two different users. Send a message and verify it arrives in real-time.
3.  **Encryption Check**: Verify that messages stored in the database are encrypted. Check the `chat_message` table in `db.sqlite3` – the `content` column should contain a Base64-encoded encrypted string, not plaintext.
4.  **Isolation Check (Shadow DOM)**: Inspect the chat widget in the browser. Verify that it is contained within a `#shadow-root (open)` and that styles from the main page do not affect it.
5.  **Multi-Platform check**: Integrate the widget into a simple HTML file and verify that the chat works as expected.
