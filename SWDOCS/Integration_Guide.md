# WCA Secure Chat - Multi-Platform Integration Guide

## Overview
WCA Secure Chat is designed to be a "plug-and-play" component. Because it uses **Shadow DOM**, it can be injected into any web application without CSS or JS conflicts.

---

## 1. Vanilla HTML / JS Application
The simplest way to integrate the chat is via a direct script tag.

### Steps:
1.  **Place the Anchor**: Add a `div` with `id="root"` (or your configured ID) where you want the chat to mount.
2.  **Include the Script**: Load the compiled JavaScript file as a module.

```html
<!-- index.html -->
<body>
    <div id="main-content">Your Application Content</div>
    
    <!-- Chat Widget Anchor -->
    <div id="chatroot"></div>

    <!-- Load the Widget -->
    <script type="module" src="https://your-server/chat/static/chat/ChatWithUsWid.js"></script>
</body>
```

---

## 2. React Application
In a React host, you should treat the widget as an external side-effect to ensure it doesn't interfere with the host's virtual DOM.

### Steps:
1.  **Create a Wrapper Component**: Use `useEffect` to load the script dynamically and provide the anchor.

```tsx
// ChatIntegration.tsx
import React, { useEffect } from 'react';

const ChatIntegration = () => {
    useEffect(() => {
        const script = document.createElement('script');
        script.src = "https://your-server/chat/static/chat/ChatWithUsWid.js";
        script.type = "module";
        script.async = true;
        document.body.appendChild(script);

        return () => {
            document.body.removeChild(script);
        };
    }, []);

    return <div id="root"></div>;
};

export default ChatIntegration;
```

---

## 3. Spring Boot (Thymeleaf)
Spring Boot applications using Thymeleaf can integrate the chat by adding the script to their base templates.

### Steps:
1.  **Host the Asset**: Place `ChatWithUsWid.js` in `src/main/resources/static/js/`.
2.  **Update Template**: Use Thymeleaf syntax to include the script.

```html
<!-- layout.html -->
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org">
<body>
    <div th:replace="${content}"></div>

    <!-- Chat Anchor -->
    <div id="chatroot"></div>

    <!-- Chat Script -->
    <script type="module" th:src="@{/js/ChatWithUsWid.js}"></script>
</body>
</html>
```

---

## 4. Python (Flask / Django)
In Python web frameworks, you can inject the user's identity directly into the page to facilitate seamless chat login.

### Django Example:
```html
<!-- base.html -->
<body>
    {% block content %}{% endblock %}

    <div id="chatroot"></div>

    <script type="module">
        // Optional: Pass current user info to global scope if needed by widget
        window.CHAT_USER = "{{ request.user.username }}";
    </script>
    <script type="module" src="https://your-server/chat/static/chat/ChatWithUsWid.js"></script>
</body>
```

### Flask Example:
```html
<!-- layout.html -->
<body>
    {% block body %}{% endblock %}

    <div id="chatroot"></div>

    <script type="module" src="{{ url_for('static', filename='js/ChatWithUsWid.js') }}"></script>
</body>
```

---

## 5. Security & CORS Configuration
When the chat widget is hosted on a different domain than the Django backend, you **must** configure CORS.

### Django `settings.py`:
```python
INSTALLED_APPS = [
    ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', # Must be at the top
    ...
]

# Allow specific host applications
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",   # React Dev
    "http://localhost:8080",   # Spring Boot
    "http://your-app-domain.com",
]

# If the widget needs to send cookies/session
CORS_ALLOW_CREDENTIALS = True
```

---

## 6. Communication via WebSocket
Ensure the host application's firewall/proxy allows WebSocket traffic (`ws://` or `wss://`) to the chat server on the configured port (default 8000).
