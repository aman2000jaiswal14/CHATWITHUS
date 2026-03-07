# WCA Secure Chat - System Architecture

## Overview
WCA Secure Chat is a defense-grade, high-isolation messaging platform designed for restricted, low-bandwidth (1 Mbps) isolated networks. Its primary design goal is to be a "plug-and-play" component that can be easily integrated into any host web application with zero CSS/JS leakage.

## Core Design Principles
1. **Plug-and-Play Isolation**: The entire frontend is encapsulated within a Web Components Shadow Root. This ensures that the widget's styles and logic do not interfere with the host application.
2. **Bandwidth Optimization**: Uses binary Protocol Buffers (Protobuf) instead of JSON for transmission to minimize overhead on restricted 1 Mbps connections.
3. **Security First**: Implements end-to-end payload encryption using AES-256-GCM and a robust client-side RSA-PSS license verification system.
4. **Real-time Synchronicity**: Leverages Django Channels and WebSockets for low-latency, multiplexed communication.

## High-Level Components

### 1. React Frontend Widget
- **Shadow DOM**: Renders the UI in an isolated shadow root.
- **Zustand Store**: Manages reactive state for messages, groups, and presence.
- **WebSocket Client**: Handles binary protobuf communication and re-connection logic.
- **Security Services**: Handles AES encryption and RSA license verification.

### 2. Django Backend Server
- **Channels Consumer**: Manages WebSocket connections and routes messages based on Protobuf envelopes.
- **Protobuf Layer**: Handles serialization/deserialization of binary messages.
- **Database (SQLite/PostgreSQL)**: Persists encrypted message history, groups, and user status.
- **Redis/Valkey**: Distributed channel layer for multi-node clustering and real-time message broadcasting.

### 3. Messaging Flow
1. **User Action**: A user sends a message through the React UI.
2. **Encryption**: The message payload is encrypted using AES-256-GCM.
3. **Protobuf Encoding**: The encrypted payload is wrapped in a Protobuf `ChatMessage` and then into a `ProtocolWrapper`.
4. **Transmission**: The binary data is sent over a WebSocket connection to `ws://chat/{user_id}/`.
5. **Backend Routing**: The Django consumer parses the Protobuf, writes the encrypted content to the DB, and routes the binary message to the recipient's personal group or the target chat group via Redis.
6. **Recipient Delivery**: The recipient's WebSocket client receives the binary data, decodes the Protobuf, decrypts the payload, and updates the UI.

## Technology Stack
- **Frontend**: React, Vite, Tailwind CSS, Zustand, Lucid-React.
- **Communication**: WebSockets (Django Channels), Protocol Buffers.
- **Backend**: Django, Django Channels, djangorestframework.
- **Security**: Web Crypto API (Frontend), PyCryptodome (Backend), RSA-PSS, AES-256-GCM.
- **Data Persistence**: SQLite (Dev) / PostgreSQL (Prod), Redis/Valkey (Channel Layer).
