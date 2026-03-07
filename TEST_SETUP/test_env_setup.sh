#!/bin/bash

# Exit on error
set -e

echo "🚀 Setting up the dedicated Testing Environment in TEST_SETUP/venv..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "✅ Virtual environment created."
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install Testing Tools
echo "📦 Installing testing dependencies..."
pip install \
    pytest \
    pytest-django \
    pytest-cov \
    pytest-asyncio \
    locust \
    bandit \
    playwright \
    requests \
    flask \
    flask-cors \
    fpdf2

# Install Application Dependencies in testing venv to allow imports
echo "📦 Installing application dependencies in testing venv..."
pip install -r "../Main Application/requirements.txt"

# Install Playwright browsers
echo "🌐 Installing Playwright browsers..."
playwright install --with-deps chromium

echo "✅ Testing environment setup complete!"
echo "To activate manually: source TEST_SETUP/venv/bin/activate"
