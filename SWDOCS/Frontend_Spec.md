# WCA Secure Chat - Frontend Specification

## Overview
The frontend is a modern React application designed to be compiled into a single, portable JavaScript widget. It uses a Shadow DOM for complete CSS/JS isolation, making it compatible with any host environment.

## Key Technologies
- **React 18**: UI framework.
- **Tailwind CSS**: Utility-first styling (injected into Shadow Root).
- **Zustand**: Lightweight state management.
- **Web Crypto API**: Native browser-based encryption and signature verification.
- **Protobuf.js**: Binary protocol handling.

## Shadow DOM Implementation
The widget is wrapped in a `ShadowWrapper` component that:
1. Attaches an open `shadowRoot` to a host element.
2. Injects the entire application's CSS as a `<style>` tag inside the shadow root.
3. Renders the React application into a dedicated root container within the shadow root.
4. Ensures that Tailwind styles do not "leak" out and host styles do not "leak" in.

## State Management (`useChatStore`)
Using **Zustand**, the application manages:
- **Messages**: A map of message arrays indexed by `chatId`.
- **Groups**: List of joined and available chat groups.
- **Unread Counts**: Per-chat unread message tracking.
- **Presence**: Real-time status of contacts.
- **Active Chat**: The currently selected conversation.

## WebSocket Client (`WebSocketClient`)
The client handles the lifecycle of the binary connection:
- **Multiplexing**: Uses a single connection to `ws://chat/{user_id}/`.
- **Binary Handling**: All data is sent and received as `Uint8Array`.
- **Observer Pattern**: Allows different parts of the app to subscribe to incoming message events.
- **Reconnection**: Implements exponential backoff for connection stability.

## Core Services

### `EncryptionService`
- Provides AES-256-GCM encryption/decryption for message payloads.
- Derives keys using PBKDF2 from a shared secret (foundation for E2EE).

### `LicensingService`
- Performs client-side verification of the `CWULicense.txt`.
- Validates RSA-PSS signatures and checks for license expiration.

### `ApiService`
- Handles standard REST requests (e.g., fetching initial history, uploading attachments).
- Integrated with the Licensing service to ensure only valid clients make calls.

## Component Architecture
- **`ChatWidget`**: The main entry point and toggle button.
- **`ChatWindow`**: Container for the active conversation.
- **`MessageList`**: Renders messages with support for different types (Text, PTT, System).
- **`ChatInput`**: Handles message composition, encryption, and Protobuf wrapping.
- **`Sidebar`**: Manages contact lists, group lists, and user status.
