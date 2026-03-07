# WCA Secure Chat - High-Level Design (HLD)

## 1. System Context Diagram
The following diagram illustrates how the WCA Secure Chat widget interacts with the host application and the backend infrastructure.

```mermaid
graph TD
    subgraph "External/Host Environment"
        User((User))
        HostApp[Host Web Application]
        ShadowDOM[Shadow DOM Chat Widget]
        User -- Interacts --> HostApp
        HostApp -- Embeds --> ShadowDOM
    end

    subgraph "Secure Chat Infrastructure"
        Backend[Django Channels Backend]
        Redis[(Redis Channel Layer)]
        DB[(SQLite/Postgres DB)]
        
        ShadowDOM -- "Binary WebSockets (Protobuf)" --> Backend
        Backend -- "Pub/Sub" --> Redis
        Backend -- "Persistance" --> DB
    end

    subgraph "License & Security"
        LicenseFile[CWULicense.txt]
        ShadowDOM -- "Validates" --> LicenseFile
    end
```

## 2. Secure Chat Flow (DM & Group)
This diagram shows the end-to-end journey of a message, emphasizing the encryption and protobuf wrapping stages.

```mermaid
sequenceDiagram
    participant Sender as User A (React)
    participant S_Enc as Encryption Service
    participant S_Proto as Protobuf Wrapper
    participant S_WS as WebSocket Client
    participant Server as Django Consumer
    participant Redis as Redis Channel Layer
    participant Recipient as User B (React)

    Sender->>S_Enc: Input Plaintext Message
    S_Enc->>S_Enc: AES-256-GCM Encrypt
    S_Enc-->>Sender: Ciphertext (Base64)
    
    Sender->>S_Proto: chat_message { payload: ciphertext }
    S_Proto->>S_Proto: Encode to Binary (Uint8Array)
    
    Sender->>S_WS: Send Binary Data
    S_WS->>Server: WebSocket Binary Frame
    
    Server->>Server: Parse Protobuf Wrapper
    Server->>DB: Save Encrypted Message to DB
    
    alt is_direct_message
        Server->>Redis: group_send('user_B')
    else is_group_message
        Server->>Redis: group_send('group_ID')
    end
    
    Redis-->>Recipient: Deliver Binary via WebSocket
    
    Recipient->>Recipient: Decode Protobuf
    Recipient->>Recipient: AES-256-GCM Decrypt Payload
    Recipient->>Recipient: Update Zustand Store
    Recipient-->>Recipient: Render in UI
```

## 3. User & Group Creation Flow
How users and groups are established within the chat ecosystem.

```mermaid
graph LR
    A[User Registration/Login] --> B{Host App Authenticated?}
    B -- Yes --> C[Chat Widget Loads]
    C --> D[Connect to ws://chat/user_id/]
    
    E[Group Creation] --> F[Client sends Command: SUBSCRIBE_GROUP]
    F --> G[Backend adds Channel to Redis Group]
    G --> H[Group Entry in DB]
    H --> I[Broadcast 'group_refresh' to members]
```

## 4. License Verification Flow
The process ensuring only authorized clients can use the widget.

```mermaid
graph TD
    A[Widget Initialization] --> B[Fetch CWULicense.txt]
    B --> C[Extract Metadata & RSA Signature]
    C --> D{Verify RSA-PSS Signature?}
    D -- Invalid --> E[Show License Error UI]
    D -- Valid --> F{Check Expiration?}
    F -- Expired --> G[Show Expired UI]
    F -- Active --> H[Enable Chat Features]
```
