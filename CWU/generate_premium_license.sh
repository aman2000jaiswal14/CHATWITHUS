#!/bin/bash

# Navigate to the CWU directory where the generator script lives
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

# Calculate date 1 month (30 days) from now
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS / BSD date format
    EXPIRY_DATE=$(date -v+30d +%Y-%m-%d)
else
    # Linux GNU date format
    EXPIRY_DATE=$(date -d "+30 days" +%Y-%m-%d)
fi

CUSTOMER="Premium Tier Client"
MODULES="VOICE,MARKDOWN,E2E,NOTIFICATIONS,LAZYLOADING"
ALLOWED_CHARS="^[A-Za-z0-9\s.,!?'\"@_\-+*~\\\\\`{}()<>[\]]+$"

echo "Generating Premium License..."
echo "Expiry Date: $EXPIRY_DATE"
echo "Modules Enabled: $MODULES"
echo "Allowed Characters (Expanded): $ALLOWED_CHARS"

# Generate the license file using Python
python3 generate_license_by_date.py "$CUSTOMER" "$EXPIRY_DATE" "PREMIUM" "Corporate Inc" "ChatWithUs" "1.0.0" "Premium Enterprise License" "$MODULES" "$ALLOWED_CHARS"

echo "-----------------------------------"
echo "Copying CWULicense.txt to deployment directories..."

# Django backend target
cp CWULicense.txt "../Main Application/CWULicense.txt"
echo "[+] Copied to Main Application/"

# Flask frontend wrapper
cp CWULicense.txt "../flasktest/CWULicense.txt"
echo "[+] Copied to flasktest/"

echo "Done. Premium features are now fully unlocked."
