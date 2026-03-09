# Module 2: Emergency Broadcast System (EBS)

## Overview
The Emergency Broadcast System (EBS) is a premium module designed for critical, high-priority communications. It allows designated users to send system-wide alerts that bypass normal chat filters, trigger distinct audio-visual alarms on client devices, and remain persistently visible until acknowledged.

### Key Features
- **Role-Based Access Control**: Only users with the explicit "Commander" role can initiate an Emergency Broadcast. The backend enforces this verification before processing the message.
- **Global Delivery**: Emergency messages are broadcasted to all currently connected users instantly via a dedicated websocket channel group (`all_users`).
- **Persistent Virtual Group**: The frontend dynamically injects an "EMERGENCY BROADCAST" virtual chat room pinned to the top of the sidebar. This ensures the alerts are never lost in typical conversation history.
- **Persistent Unread Tracking**: Unread counts for emergency broadcasts are accurately tracked for all users, including those who were offline when the alert was sent. The backend calculates this using the `ChatReadCursor` model against messages flagged with `is_emergency_broadcast`.
- **Intrusive Audio-Visual Alerts**: Incoming broadcasts trigger a non-bypassable 2-second siren sound (for recipients only, not the sender) and display a prominent warning banner across the application UI.

## Backend Implementation
- **Model Flag**: The `Message` model includes an `is_emergency_broadcast` boolean.
- **Consumers Setup**: In `consumers.py`, the system forces the `is_group_message` flag to `True` and sets the `target_id` to `"EMERGENCY"` to ensure uniform processing.
- **API Endpoints**: 
    - `/chat/api/groups/`: Calculates and injects the virtual group's unread count into the response.
    - `/chat/api/history/emergency/`: Retrieves the historical broadcast messages.

## Licensing
This module is controlled by a specific license key module string.

- **License Flag**: `EMERGENCY_BROADCAST` (must be present in the `MODULES` field)
- **Enforcement**: 
    - **Backend**: The virtual group and its unread counts are only injected into API responses if the license field is present.
    - **Frontend**: The "Emergency Alert" button and the persistent sidebar room are hidden if the module is not licensed.

### How to add to License file
When generating a license using the `generate_license_by_date.py` script, include the `EMERGENCY_BROADCAST` flag in the module arguments.

```bash
python3 generate_license_by_date.py "Customer Name" 2026-12-31 PREMIUM,EMERGENCY_BROADCAST
```
