# Module 9: Message Threading & Replies

## 1. Overview
Module 9 introduces the **Message Threading** capability, allowing users to reply to specific messages in both Direct Messages (DM) and Group Chats. This feature enhances conversation clarity by providing visual context and navigation to referenced historical messages.

## 2. Technical Implementation

### A. Protocol Layer (Protobuf)
The `ChatMessage` structure in `messages.proto` was extended with a `reply_to_message_id` field.
```protobuf
message ChatMessage {
    string message_id = 1;
    string sender_id = 2;
    // ...
    string reply_to_message_id = 12; // Threading Reference
}
```

### B. Database Schema
The `chat.Message` model now includes a `reply_to_message_id` field to persist threading relationships.
- **Field**: `reply_to_message_id` (CharField, nullable)
- **Migration**: `0021_add_reply_to_message_id`

### C. Backend Logic
The WebSocket consumer (`consumers.py`) extracts and persists the `reply_to_message_id` during the `save_message_to_db` async operation.

### D. Licensing Enforcement
The "REPLY" module must be present in the `MODULES` field of the signed `CWULicense.txt`. The backend rejects reply attempts (messages containing a `reply_to_message_id`) if the module is not licensed.

## 3. Frontend Experience
- **Interactive Trigger**: Hovering over a message reveals a `Reply` icon.
- **Thread Context**: Replied messages show a snippet of the original message above the content.
- **Snap-to-Source**: Clicking the reply snippet automatically scrolls the chat view to the original message.
- **Input Preview**: A sticky preview area above the input field indicates the message being replied to, with a "Cancel" option.

## 4. Security Considerations
- **Impersonation Prevention**: The backend validates that the `sender_id` in the Protobuf message matches the authenticated session user, even when replying.
- **Module Authorization**: Licensed features are verified server-side to prevent client-side bypasses.
