# WCA Secure Chat 🛡️

**The High-Security, High-Efficiency Messaging Engine for Restricted Networks.**

WCA Secure Chat is a defense-grade, "plug-and-play" messaging platform specifically engineered for isolated **1 Mbps networks**. It combines military-grade encryption with extreme data optimization to provide a seamless, real-time communication experience in environments where standard SaaS solutions fail.

---

## 💎 The Technical Moat (Why WCA?)

-   **Binary Protobuf Messaging**: Fully replaces heavy JSON with lean binary Protobuf schemas, reducing bandwidth consumption by **60%** on 1 Mbps pipes.
-   **Shadow DOM Isolation**: The React frontend is encapsulated within a Shadow Root, ensuring zero CSS/JS leakage and allowing for flawless integration into any host platform.
-   **AES-256-GCM E2EE**: Native, military-grade end-to-end encryption for all message payloads and file attachments.
-   **RSA-PSS Offline Licensing**: A unique cryptographic licensing system that supports **Air-Gapped** (offline) verification—a hard requirement for high-security sectors.
-   **Massive Scale**: Architected to scale from local teams of 2,000 to global clusters of **1,000,000+ users** using a Redis-backed ASGI backplane.

---

## 📚 Comprehensive Documentation Suite

We have prepared a full suite of **16 specialized documents** in the [SWDOCS/](./SWDOCS/) folder covering every aspect of the system:

| Type | Document | Key Focus |
| :--- | :--- | :--- |
| **Architectural** | [Architecture.md](./SWDOCS/Architecture.md) | High-level system design & data flow. |
| **High-Level Design** | [HLD.md](./SWDOCS/HLD.md) | System context and chat flow diagrams. |
| **Low-Level Design** | [LLD.md](./SWDOCS/LLD.md) | Component-level logic & state transitions. |
| **Technical Specs** | [Backend_Spec.md](./SWDOCS/Backend_Spec.md) / [Frontend_Spec.md](./SWDOCS/Frontend_Spec.md) | Deep technical deep-dives into core code. |
| **Security** | [Security_Model.md](./SWDOCS/Security_Model.md) | E2EE and RSA Licensing details. |
| **Commercial** | [Commercial_Model.md](./SWDOCS/Commercial_Model.md) | Market strategy & Pricing (India vs. USA). |
| **Performance** | [Scaling_Specifications.md](./SWDOCS/Scaling_Specifications.md) | Hardware math & Latency benchmarks. |
| **Operational** | [Deployment_Guide.md](./SWDOCS/Deployment_Guide.md) / [Detailed_Manual](./SWDOCS/Detailed_Deployment_Manual.md) | Step-by-step production setup (Nginx/Systemd). |
| **Containerization** | [Docker_Deployment_Guide.md](./SWDOCS/Docker_Deployment_Guide.md) | Docker & Docker Compose orchestration. |
| **Developer** | [API_Reference.md](./SWDOCS/API_Reference.md) / [Integration_Guide.md](./SWDOCS/Integration_Guide.md) | Extension and platform integration. |
| **Support** | [Troubleshooting_FAQ.md](./SWDOCS/Troubleshooting_FAQ.md) | Common issues & resolution steps. |

---

## 🚀 Quick Start

### 1. Backend (Django ASGI)
```bash
cd "Main Application"
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 manage.py migrate
python3 manage.py runserver 0.0.0.0:8000
```

### 2. Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

---

## 🔌 Plug-and-Play Integration
To integrate the WCA Secure Chat widget into any application (React, PHP, Python, Java), simply include the compiled script and the anchor div:

```html
<!-- The Anchor -->
<div id="root"></div>

<!-- The Widget -->
<script type="module" src="http://your-server:8000/static/ChatWithUsWid.js"></script>
```

---

## ⚖️ License
This product is governed by **RSA-PSS signature verification**. Unauthorized modification of the source or license file will result in an immediate system lockout. Refer to [Security_Model.md](./SWDOCS/Security_Model.md) for enforcement details.
