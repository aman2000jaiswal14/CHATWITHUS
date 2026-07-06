#!/bin/bash

# Exit on error
set -e

echo "🔒 WCA Secure Chat - Local SSL Runner with Env"
echo "----------------------------------------------"

cd "$(dirname "$0")"

# 1. Load environment variables from .env if it exists
if [ -f .env ]; then
    echo "⚙️  Loading environment variables from .env..."
    while IFS= read -r line || [ -n "$line" ]; do
        # Strip potential carriage returns (\r)
        line=$(echo "$line" | tr -d '\r')
        # Ignore comments and empty lines
        if [[ ! "$line" =~ ^# ]] && [[ ! -z "$line" ]]; then
            export "$line"
        fi
    done < .env
fi

# 2. Generate local certs if they don't exist
if [ ! -f "localhost.crt" ] || [ ! -f "localhost.key" ]; then
    echo "Creating local self-signed certificates..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout localhost.key -out localhost.crt \
        -subj "/C=US/ST=State/L=City/O=Organization/OU=IT Department/CN=localhost"
    echo "✅ Certificates created."
else
    echo "✅ Using existing local certificates."
fi

# 3. Activate Virtual Environment if exists
if [ -d "venv" ]; then
    source venv/bin/activate
fi

# 4. Ensure Daphne is installed
pip install -q daphne

# 5. Apply any pending database migrations
echo "⚙️  Applying database migrations..."
python manage.py migrate

# 6. Compile backend protobuf schema using python grpc_tools or system protoc
if python -c "import grpc_tools.protoc" &> /dev/null; then
    echo "⚙️  Compiling backend Protobuf schemas using grpcio-tools..."
    (cd chat/protocols && python -m grpc_tools.protoc -I. --python_out=. messages.proto)
elif command -v protoc &> /dev/null; then
    echo "⚙️  Compiling backend Protobuf schemas using system protoc..."
    (cd chat/protocols && protoc -I. --python_out=. messages.proto)
else
    echo "⚠️  python grpc_tools and protoc not found, skipping backend protobuf recompilation."
fi

echo "🚀 Starting Daphne with SSL on https://localhost:8000"
echo "   (WebSocket available at wss://localhost:8000/ws/)"

# Run Daphne with SSL
daphne -e ssl:8000:privateKey=localhost.key:certKey=localhost.crt core.asgi:application
