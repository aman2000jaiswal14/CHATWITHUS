# Module 4: Push-to-Talk Voice Notes (VOICE)

## Overview
The Voice module enables users to record and send audio messages (Voice Notes) directly within the chat interface. It is optimized for low-latency transmission and high-quality audio compression.

## Features
- **PTT Recording**: Integrated microphone button with real-time recording animation.
- **Audio Compression**: Uses WebM/Opus encoding to minimize bandwidth usage.
- **Auto-Playback**: Dedicated audio player within the message bubble.
- **Secure Storage**: Audio files are treated as binary attachments and follow the system's E2E encryption policy.

## Licensing Enforcement
- **Module ID**: `VOICE`
- **Gating**:
    - **Frontend**: The microphone (Mic) recording button is removed from the chat input area if the module is missing.
    - **Backend**: Prevents uploading audio binary blobs via PTT-specific endpoints if unlicensed.
