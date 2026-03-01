This is the final **Product Requirements Document (PRD)** for the **WCA Secure Sovereign Chat**. 

It consolidates all technical, functional, and security requirements to build a **Defense-Grade, Zero-Cost, Plug-and-Play** messaging platform capable of handling **20,000 users** on a restricted **1 Mbps isolated network**.

---

# Product Requirements Document (PRD): WCA Secure Sovereign Chat

## 1. Executive Summary
**WCA Secure Sovereign Chat** is a high-scale, ultra-secure communication module designed for air-gapped defense environments. It follows a "Plug-and-Play" model, allowing it to be integrated into any React/Django or Spring application. It prioritizes data sovereignty, low-bandwidth efficiency, and zero licensing costs.

## 2. Strategic Product Constraints
*   **User Capacity:** 20,000 concurrent active WebSocket connections.
*   **Network Environment:** Isolated On-Premises LAN with **1 Mbps total shared bandwidth**.
*   **Data Retention:** 6-month rolling history (180 days).
*   **Budget:** **$0.00 Licensing Fees** (100% permissive open-source stack).
*   **Deployment:** Self-contained "Sovereign Cell" (Docker-based).

---

## 3. The Zero-Cost Technology Stack
| Layer | Technology | License | Purpose |
| :--- | :--- | :--- | :--- |
| **Backend** | Django + Channels | BSD | Logic and WebSocket management. |
| **Real-time Engine** | **Valkey** (Redis Fork) | BSD | Presence, Pub/Sub, and Scaling. |
| **Database** | PostgreSQL | Postgres | Permanent message/bookmark storage. |
| **Frontend** | React (Shadow DOM) | MIT | Conflict-free UI integration. |
| **Serialization** | **Protobuf** | BSD | Binary data to minimize bandwidth. |
| **Voice Codec** | Opus | BSD | Tactical audio at 6kbps. |
| **Load Balancer** | Nginx | BSD | Horizontal scaling of Django nodes. |

---

## 4. Functional Requirements

### 4.1. Secure Messaging & Metadata
*   **Text & Group Messaging:** Binary-encoded messaging via Protobuf to bypass JSON overhead.
*   **Detailed Timestamps:** Every text carries two mandatory points:
    *   **Sent At:** Timestamp from the sender's device (Local).
    *   **Received At:** Timestamp from the server (UTC/Audit standard).
*   **User Status & Presence:**
    *   Customizable states: *Online, Away, Sleeping, On-Mission.*
    *   **Passive Sync:** Updates are only sent to active chat peers to save the 1 Mbps pipe.

### 4.2. Tactical Voice (Push-to-Talk)
*   **Burst Audio:** Asynchronous voice messaging (not live calls) to ensure delivery over slow LAN.
*   **PTT Logic:** Users record a "burst" which is encrypted and prioritized in the network queue.

### 4.3. Contact Bookmarks & Discovery
*   **Independent Contact List:** A "Favorites" system managed by the Django engine.
*   **Bookmark Fields:** Username and Display Name.
*   **Zero-Bandwidth Search:** Contacts are cached in the browser's **IndexedDB**; search is performed locally.

### 4.4. Broadcast Alerts
*   **Master Overrides:** Critical alerts that bypass standard chat queues.
*   **Digital Authority:** Only users with specific "Commander" JWT claims can trigger broadcasts.

---

## 5. Defense-Grade Security

### 5.1. Data in Transit (DiT)
*   **mTLS (Mutual TLS):** All internal server-to-server traffic is certificate-verified.
*   **End-to-End Encryption (E2EE):** **Double Ratchet (Signal Protocol)**. No plain-text messages ever exist on the server.

### 5.2. Data at Rest (DaR)
*   **Server Encryption:** AES-256 Transparent Data Encryption for Postgres and media volumes.
*   **Client Encryption:** Local IndexedDB is encrypted using keys derived from the user's session.
*   **Secure Shredding:** 6-month cleanup uses **Zero-fill/shredding** to prevent forensic disk recovery.

---

## 6. Technical Architecture & Scaling

### 6.1. Hybrid State Model
*   **Stateless Auth:** Uses **JWT** issued by the host app (Spring/Django) for zero-session-store overhead.
*   **Stateful Messaging:** Persistent WebSockets for real-time delivery and bandwidth efficiency.

### 6.2. Horizontal Scalability
*   **Distributed Pub/Sub:** Uses Valkey as a backplane to coordinate messages across multiple Django nodes.
*   **PgBouncer:** Mandatory connection pooling to handle 20k users hitting a single Postgres instance.
*   **Backplane Isolation:** Server-to-server traffic (Valkey/Postgres) must run on a secondary gigabit internal LAN, keeping the **1 Mbps pipe** dedicated purely to user traffic.

---

## 7. Bandwidth Optimization Strategy (1 Mbps Focus)
1.  **Binary Serialization:** Using Protobuf to strip 70% of standard JSON weight.
2.  **Heartbeat Throttling:** WebSocket "pings" are extended to 60-second intervals.
3.  **Local-First Search:** Message history and contacts are indexed in the browser's IndexedDB. Search queries never leave the user's device.
4.  **Delta-Loading:** The app only syncs the difference (delta) between the local store and the server.

---

## 8. Integration (The Plug-and-Play Requirement)
*   **Independent Database:** The Chat Engine must not share tables with the host application.
*   **Single-Component Entry:** The React UI must be a single `<ChatWidget />` import.
*   **Auth Bridge:** Handled via a Shared Secret Key used to validate external JWTs.

---

## 9. Hardware / On-Prem Specifications
Minimum requirements for the **Sovereign Cell** (20,000 users):
*   **Compute:** 16-Core CPU (Dedicated to WebSocket concurrency).
*   **Memory:** 32 GB RAM (Valkey and Postgres caching).
*   **Disk:** 500 GB NVMe SSD (Optimized for high-speed indexing).
*   **OS:** Hardened Linux (Ubuntu/Rocky) running Docker/Podman.

---

## 10. Cost & Compliance
*   **Licensing Cost:** **$0.00.**
*   **Maintenance:** Automated "Janitor" service for 180-day data shredding and Valkey health monitoring.
*   **Auditability:** Immutable append-only audit logs for all administrative actions.

---
**End of PRD**
