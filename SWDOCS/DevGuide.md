# WCA Secure Chat - Developer Workflow Guide (DevGuide)

This guide provides the exact commands and steps required to build, license, and deploy the WCA Secure Chat widget into host applications.

---

## 1. Frontend Build Workflow

The frontend is a React application that needs to be compiled into a single, self-contained JavaScript "widget" file.

### Step 1: Navigate to Frontend Directory
```bash
cd frontend
```

### Step 2: Install Dependencies (If not already done)
```bash
npm install
```

### Step 3: Run the Build Command
```bash
npm run build
```

### Step 4: Locate the Output
The build process will generate a single file:
- **Location**: `frontend/dist/ChatWithUsWid.js`

---

## 2. License Management Workflow

Licenses are cryptographically signed using RSA-PSS. You must generate a license for the specific host domain or expiration date.

### Step 1: Navigate to the CWU Directory
```bash
cd CWU
```

### Step 2: Generate a License
Run the generator script. The basic generator uses defaults, while the date-specific generator allows for custom expiration and customer details.

**Option A: Basic License (Defaults)**
```bash
python3 license_generator.py
```

**Option B: Custom Expiration License (Recommended)**
Usage: `python3 generate_license_by_date.py <customer_name> <expiry_date_YYYY-MM-DD> [type]`

```bash
# Example: Generate a Premium license for 'Aman' expiring on Dec 31, 2026
python3 generate_license_by_date.py "Aman Jaiswal" 2026-12-31 PREMIUM
```

### Step 3: Locate the License File
- **Location**: `CWU/CWULicense.txt`

---

## 3. Deployment to Host Applications (e.g., Flask)

Once you have the **Widget JS** and the **License File**, you need to "copy-paste" them into your host application (like the `flasktest` environment).

### Step 1: Copy the Widget JS
Copy the built file into the static/root directory of your Flask app.
```bash
cp frontend/dist/ChatWithUsWid.js flasktest/ChatWithUsWid.js
```

### Step 2: Copy the License File
Copy the new license into the same directory where the Flask app expects it.
```bash
cp CWU/CWULicense.txt flasktest/CWULicense.txt
```

### Step 3: Verify and Configure the Host Integration
Ensure your host template (`flasktest/templates/dashboard.html` or similar) is loading the script and providing the necessary configuration object.

**Important**: The widget expects a global `window.CHAT_CONFIG` object to be defined *before* the script is loaded.

```html
<!-- 1. The Configuration Object -->
<script>
window.CHAT_CONFIG = {
    USER_ID: "{{ user.username }}", // The unique ID of the current user
    API_BASE_URL: "http://localhost:8000", // Backend API URL
    WS_URL: "ws://localhost:8000/ws/chat/{{ user.username }}/", // WebSocket URL
    LICENSE_INFO: {{ CWU_LICENSE_INFO | tojson }}, // The signed license object
};
</script>

<!-- 2. The Anchor Div -->
<div id="root"></div>

<!-- 3. Load the Widget Script -->
<script type="module" src="{{ url_for('static', filename='ChatWithUsWid.js') }}"></script>
```

---

## 4. Backend Deployment (Django)

Ensure the Django backend is running and the license is also present in the backend if you are running licensing checks on the server side.

### Step 1: Copy License to Backend
The backend licensing service expects the license file to be present in its service directory.
```bash
cp CWU/CWULicense.txt "Main Application/chat/services/CWULicense.txt"
```

### Step 2: Restart the Backend
Whenever settings or core services change, restart the Django server:
```bash
cd "Main Application"
python3 manage.py runserver
```

---

## 5. Summary Developer Checklist
- [ ] Build Frontend: `npm run build`
- [ ] Copy `ChatWithUsWid.js` to Host App
- [ ] Generate License: `python3 license_generator.py`
- [ ] Copy `CWULicense.txt` to Host App AND Backend
- [ ] Refresh Host Application and Verify
