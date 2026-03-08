# Modular Licensing Guide: ChatWithUs Advanced Features

This document explains the modular licensing system used in ChatWithUs. Each advanced feature is gated by a specific module identifier in the `CWULicense.txt` file under the `MODULES` field.

## 0. License Gating
To enable a module, the `MODULES` field must contain the corresponding code.
Example: `MODULES: SDM, OM, EB, AL, MR`

## 1. Modules Detailed

### **SDM: Self-Destructing Messages**
- **Indicator**: Shows "msg recv time expires" upon expiry.
- **Persistence**: Messages remain in history but show the "Expired" status overlay.
- **Policy**: Gated by the SDM module; hidden otherwise.

### **OM: Offline Messaging**
- **Queue**: Uses `IndexedDB` to store messages if the WebSocket is down.
- **Sync**: Automatically flushes as soon as connection returns.
- **Visibility**: Only active if the OM module is licensed.

### **EB: Emergency Broadcasts**
- **Priority**: Overlays current view with a pulsed alert.
- **Routing**: Bypasses mute settings for all connected users.
- **Control**: Authorized-only API endpoints gated by the EB module.

### **AL: Secure Audit & Compliance**
- **Tracing**: Tracks logins, alerts, and membership changes.
- **Logs**: Persistent storage in an immutable `AuditLog` table.
- **Access**: Admin-only API, hidden without the AL module.

### **MR: Mission Rooms**
- **UI**: Triggers specialized operational themes and header flags.
- **Sorting**: Priority-pinned in the sidebar.
- **Gating**: Only mission-designated groups are active with the MR module.
