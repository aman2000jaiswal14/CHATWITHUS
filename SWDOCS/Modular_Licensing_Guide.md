# Modular Licensing Guide: ChatWithUs Advanced Features

This document explains the modular licensing system used in ChatWithUs. Each advanced feature is gated by a specific module identifier in the `CWULicense.txt` file under the `MODULES` field.

## 0. License Gating
To enable a module, the `MODULES` field must contain the corresponding identifier string.
Example: `MODULES: SELFDESTRUCT, EMERGENCY_BROADCAST, READ_RECEIPT, VOICE, E2E, MARKDOWN, NOTIFICATIONS, LAZYLOADING`

## 1. Modules Detailed

### **SELFDESTRUCT: Self-Destructing Messages**
- **Logic**: Automatic message expiry and local/remote cleanup.
- **UI**: Shows "MSG TIME EXPIRES" and masks content after the timer (default 24h) ends.
- **Enforcement**: Gated by the `SELFDESTRUCT` identifier.

### **EMERGENCY_BROADCAST: Emergency Alerts**
- **Priority**: High-visibility pulsed UI overlay with specialized sound.
- **Routing**: Bypasses mute settings for all connected users; restricted to authorized senders.
- **Control**: Gated by the `EMERGENCY_BROADCAST` identifier.

### **READ_RECEIPT: Secure Read Receipts**
- **Logic**: End-to-end receipt tracking (Single, Double, Blue ticks).
- **Aggregation**: Group messages only upgrade status when *all* recipients reach the threshold.
- **Control**: Gated by the `READ_RECEIPT` identifier.

### **VOICE: Push-to-Talk (PTT) Audio**
- **Function**: Audio recording and playback directly within the chat interface.
- **Security**: Audio blobs are encrypted (if E2E is active) before transmission.
- **Control**: Gated by the `VOICE` identifier; hides the Mic button if unlicensed.

### **E2E: End-to-End Encryption**
- **Security**: AES-256-GCM client-side encryption.
- **Persistence**: Data is encrypted before leaving the browser; server only sees encrypted blobs.
- **Control**: Gated by the `E2E` identifier.

### **MARKDOWN: Rich Text Formatting**
- **Function**: Support for bold, italics, code blocks, and lists within messages.
- **Engine**: Client-side rendering via `react-markdown`.
- **Control**: Gated by the `MARKDOWN` identifier.

### **NOTIFICATIONS: Audio-Visual Alerts**
- **Function**: Real-time browser notifications and acoustic alerts on message arrival.
- **Persistence**: Respects per-chat mute settings.
- **Control**: Gated by the `NOTIFICATIONS` identifier.

### **LAZYLOADING: Efficient History**
- **Function**: Paginated message loading and infinite scroll.
- **Performance**: Reduces initial load time and memory footprint for large chat histories.
- **Control**: Gated by the `LAZYLOADING` identifier.
