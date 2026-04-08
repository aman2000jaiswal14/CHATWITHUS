# Module 3: Secure Read Receipts (RR)

## Overview
The Secure Read Receipts module provides real-time, WhatsApp-style status tracking for messages. It is designed to work in Bandwidth-Restricted and End-to-End Encrypted (E2EE) environments by using binary Protobuf messaging.

## Features

### 1. Delivery & Read Status
- **Single Tick**: Message successfully persisted on the server.
- **Double Tick (Grey)**: Message delivered to the recipient's device.
- **Blue Ticks**: Message read by the recipient.

### 2. Group Aggregation (Anti-Flicker)
In group chats, status ticks are intelligently aggregated:
- **Aggregation Logic**: The server tracks individual member receipts in a hidden `group_receipts` field.
- **Threshold**: Double or Blue ticks are only broadcast to the sender when **100% of valid group members** have reached that status.
- **Privacy**: No individual member status is leaked to the sender; only the overall group status is visible.

### 3. Protobuf Integration
Receipts are sent as binary `Receipt` messages to minimize overhead:
```proto
message Receipt {
    enum ReceiptType {
        DELIVERED = 0;
        READ = 1;
    }
    string message_id = 1;
    string chat_id = 2; 
    string reader_id = 3;
    ReceiptType type = 4;
    bool is_group = 5;
}
```

## Licensing Enforcement
The module is strictly gated by the RSA-PSS licensing system:
- **Module ID**: `READ_RECEIPT`
- **Enforcement Layer**:
    - **Backend**: WebSocket and REST endpoints ignore receipt signals if the module is missing.
    - **Frontend**: Status ticks are hidden from view and the client automatically disables receipt emission.
