#!/bin/bash
# Automation Script: Build and Synchronize Chat Widget

# Resolve absolute path of the script directory dynamically
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$BASE_DIR/frontend"
FLASK_STATIC_DIR="$BASE_DIR/flasktest/static/chat"
DJANGO_STATIC_DIR="$BASE_DIR/Main Application/static/chat"

# 1. Change to frontend directory
cd "$FRONTEND_DIR" || { echo "❌ Error: Frontend directory not found"; exit 1; }

# 2. Compile Protobuf schemas if the proto file exists
PROTO_FILE="$BASE_DIR/Main Application/chat/protocols/messages.proto"
if [ -f "$PROTO_FILE" ]; then
    echo "⚙️  Compiling frontend Protobuf schemas..."
    ./node_modules/.bin/pbjs -t static-module -w es6 -o src/protocols/messages.js "$PROTO_FILE"
    ./node_modules/.bin/pbts -o src/protocols/messages.d.ts src/protocols/messages.js
else
    echo "⚠️  messages.proto not found in Main Application, skipping frontend protobuf recompilation."
fi

# 3. Build and Obfuscate the Frontend
npm run secure-build

if [ $? -ne 0 ]; then
    echo "❌ Error: Build failed!"
    exit 1
fi

echo "✅ Build Successful!"

# 2. Ensure destination directories exist
mkdir -p "$FLASK_STATIC_DIR"
mkdir -p "$DJANGO_STATIC_DIR"

# 3. Synchronize built files
echo "📦 Synchronizing ChatWithUsWid.js to target applications..."

# Copy to Flask
cp "$FRONTEND_DIR/dist/ChatWithUsWid.js" "$FLASK_STATIC_DIR/ChatWithUsWid.js"
echo "   - Copied to: $FLASK_STATIC_DIR/ChatWithUsWid.js"

# Copy to Django (Main Application)
cp "$FRONTEND_DIR/dist/ChatWithUsWid.js" "$DJANGO_STATIC_DIR/ChatWithUsWid.js"
echo "   - Copied to: $DJANGO_STATIC_DIR/ChatWithUsWid.js"


echo "✨ Deployment Complete! Please hard-refresh your browser to see changes."
