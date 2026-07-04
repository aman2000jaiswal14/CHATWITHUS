# Module 10: 1-on-1 WebRTC Video & Audio Calling

## 1. Overview
Module 10 introduces secure, peer-to-peer real-time video and audio calling inside the WCA Secure Chat widget. This feature enables users in direct message (1-on-1) chats to make real-time calls. Signaling (SDP offers, answers, and ICE candidates) is routed over the existing authenticated WebSocket connection, while media transmission is peer-to-peer (or relayed through TURN).

## 2. Technical Implementation

### A. Protocol Layer (Protobuf)
The `ProtocolWrapper` in `messages.proto` is extended with a `WebRTCSignal` message and field.
```protobuf
message WebRTCSignal {
    enum SignalType {
        OFFER = 0;
        ANSWER = 1;
        ICE_CANDIDATE = 2;
        CALL_INITIATE = 3;
        CALL_REJECT = 4;
        CALL_HANGUP = 5;
    }
    SignalType type = 1;
    string sender_id = 2;
    string target_id = 3;
    string sdp = 4;
    string candidate = 5;
    string call_id = 6;
    bool is_video = 7;
}

message ProtocolWrapper {
    oneof content {
        // ...
        WebRTCSignal webrtc_signal = 5;
    }
}
```

### B. Licensing Enforcement
The **`VIDEOCALL`** module must be present in the `MODULES` field of the signed `CWULicense.txt`.
- **Frontend**: Hides Call buttons in `ChatArea.jsx` if `"VIDEOCALL"` is missing from `window.CWU_VERIFIED_MODULES`.
- **Backend**: The WebSocket consumer (`consumers.py`) rejects signaling messages if `"VIDEOCALL"` is not present in the connection's parsed license.

### C. WebRTC Configuration & Traversal
- **P2P Scope**: Calling is restricted to 1-on-1 chats to avoid high mesh network overhead in 1 Mbps networks.
- **NAT Traversal**: Configured with public STUN servers for local testing, with support for configuring custom TURN relay servers (e.g., coturn) via `CHAT_CONFIG` for strict firewall environments.

## 3. Security Mitigations

1. **IP Leakage Protection**: WebRTC can expose local host IP addresses. We configure ICE transport policies and sanitize candidates if required to prevent network disclosure.
2. **Signaling IDOR / Spoofing Prevention**: The backend consumer strictly validates that the `sender_id` matches the authenticated connection user (`self.user_id`) before routing signaling packets.
3. **E2EE Media**: WebRTC uses mandatory DTLS-SRTP encryption for media streams, preventing network eavesdropping.
4. **Media Permissions**: The browser prompt is only shown when the user explicitly makes or answers a call.
