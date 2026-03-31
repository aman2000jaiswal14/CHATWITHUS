#!/bin/bash
# Automation Script: Build and Synchronize Chat Widget

# Resolve absolute path of the script directory dynamically
BASE_DIR="$(cd "$(dirname "$0")" && pwd)"
FRONTEND_DIR="$BASE_DIR/frontend"
FLASK_STATIC_DIR="$BASE_DIR/flasktest/static/chat"
DJANGO_STATIC_DIR="$BASE_DIR/Main Application/static/chat"

echo "🚀 Starting Secure Frontend Build Process..."

# 1. Build and Obfuscate the Frontend
cd "$FRONTEND_DIR" || { echo "❌ Error: Frontend directory not found"; exit 1; }
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
