#!/bin/bash

# Exit on error
set -e

echo "🔒 WCA Secure Chat - Local SSL Runner"
echo "---------------------------------------"

cd "$(dirname "$0")"

# 1. Generate local certs if they don't exist
if [ ! -f "localhost.crt" ] || [ ! -f "localhost.key" ]; then
    echo "Creating local self-signed certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout localhost.key -out localhost.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/OU=IT Department/CN=localhost"
    echo "✅ Certificates created."
else
    echo "✅ Using existing local certificates."
fi

# 2. Activate Virtual Environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# 3. Ensure Daphne is installed
pip install -q daphne

# 4. Ensure USE_HTTPS = True is set in core/settings.py

echo "🚀 Starting Daphne with SSL on https://localhost:8000"
echo "   (WebSocket available at wss://localhost:8000/ws/)"

# Run Daphne with SSL
daphne -e ssl:8000:privateKey=localhost.key:certKey=localhost.crt core.asgi:application
