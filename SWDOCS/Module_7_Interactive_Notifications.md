# Module 7: Interactive Notifications (NOTIFICATIONS)

## Overview
The Notifications module manages real-time alerts for incoming messages, ensuring important updates are never missed even when the chat is in the background.

## Features
- **Acoustic Alerts**: High-quality, low-concurrency audio notifications (pops/pings).
- **Browser Push**: Integration with browser-level notification APIs for desktop alerts.
- **Mute Controls**: Per-chat and global mute overrides.
- **Tab Indicators**: Dynamic favicon and title updates (e.g., "(1) New Message").

## Licensing Enforcement
- **Module ID**: `NOTIFICATIONS`
- **Gating**:
    - **Acoustics**: The `playNotificationSound` routine in `WebSocketClient.js` is blocked if unlicensed.
    - **Push**: The notification registration logic is disabled for non-premium licenses.
