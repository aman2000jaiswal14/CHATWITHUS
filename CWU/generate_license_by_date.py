import json
import base64
import os
from datetime import datetime
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization

# Configuration (reused from main generator)
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PRIVATE_KEY_PATH = os.path.join(SCRIPT_DIR, "private_key.pem")
LICENSE_FILE = os.path.join(SCRIPT_DIR, "CWULicense.txt")

def load_private_key():
    with open(PRIVATE_KEY_PATH, "rb") as key_file:
        return serialization.load_pem_private_key(
            key_file.read(),
            password=None
        )

def generate_license_by_date(customer_name, expiry_date_str, license_type="PREMIUM", provided_to="ABC", project="ChatWithUs", version="1.0.0", description="ChatWithUs Enterprise License", modules="VOICE,MARKDOWN,E2E,NOTIFICATIONS", allowed_chars=r"^[A-Za-z0-9\s.,!?'\"@_\-+*~\\`]+$"):
    """Generate a signed license file with a specific expiry date."""
    if not os.path.exists(PRIVATE_KEY_PATH):
        print("[!] Private key not found. Please run license_generator.py first to generate keys.")
        return

    try:
        # Validate date format
        datetime.strptime(expiry_date_str, "%Y-%m-%d")
    except ValueError:
        print("[!] Invalid date format. Please use YYYY-MM-DD.")
        return
    
    issued_at = datetime.now().strftime("%Y-%m-%d")

    # Human-readable content
    content = f"""PRODUCT: ChatWithUs
PROJECT: {project}
VERSION: {version}
DESCRIPTION: {description}
COMPANY: {customer_name}
PROVIDED TO: {provided_to}
ISSUED: {issued_at}
VALID UNTIL: {expiry_date_str}
LICENSE TYPE: {license_type}
MODULES: {modules}
"""
    # Dynamically add specific module flags if present in the comma-separated modules list
    module_list = [m.strip().upper() for m in modules.split(',')]
    if "SELFDESTRUCT" in module_list:
        content += "MODULE_SELF_DESTRUCT: ENABLED\n"
    
    content += f"ALLOWED_CHARS: {allowed_chars}\n"
    
    data_bytes = content.strip().encode('utf-8')
    
    private_key = load_private_key()
    signature = private_key.sign(
        data_bytes,
        padding.PSS(
            mgf=padding.MGF1(hashes.SHA256()),
            salt_length=32
        ),
        hashes.SHA256()
    )

    signature_b64 = base64.b64encode(signature).decode('utf-8')
    
    full_license_text = f"""--- CHAT WITH US LICENSE ---
{content.strip()}
SIGNATURE: {signature_b64}
--- END ---
"""

    with open(LICENSE_FILE, "w") as f:
        f.write(full_license_text)
    
    print(f"[+] License generated for {customer_name} (Expires: {expiry_date_str})")
    print(f"[+] License saved to {LICENSE_FILE}")

if __name__ == "__main__":
    import sys
    # Adjust paths if run from root
    if not os.path.exists("CWU") and os.path.exists("private_key.pem"):
        PRIVATE_KEY_PATH = "private_key.pem"
        LICENSE_FILE = "CWULicense.txt"

    if len(sys.argv) < 3:
        print("Usage: python3 CWU/generate_license_by_date.py <customer_name> <expiry_date_YYYY-MM-DD> [type] [provided_to] [project] [version] [description]")
        print("Example: python3 CWU/generate_license_by_date.py 'Aman Jaiswal' 2026-12-31 ENTERPRISE ABC ChatWithUs 1.0.0 'Enterprise Chat'")
    else:
        name = sys.argv[1]
        date_str = sys.argv[2]
        ltype = sys.argv[3] if len(sys.argv) > 3 else "PREMIUM"
        provided = sys.argv[4] if len(sys.argv) > 4 else "ABC"
        project = sys.argv[5] if len(sys.argv) > 5 else "ChatWithUs"
        version = sys.argv[6] if len(sys.argv) > 6 else "1.0.0"
        desc = sys.argv[7] if len(sys.argv) > 7 else "ChatWithUs Enterprise License"
        modules = sys.argv[8] if len(sys.argv) > 8 else "VOICE,MARKDOWN,E2E,NOTIFICATIONS"
        allowed_chars = sys.argv[9] if len(sys.argv) > 9 else r"^[A-Za-z0-9\s.,!?'\"@_\-+*~\\`]+$"
        
        generate_license_by_date(name, date_str, ltype, provided, project, version, desc, modules, allowed_chars)
