import json
import base64
import os
from datetime import datetime, timedelta
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives import serialization

# Configuration
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PRIVATE_KEY_PATH = os.path.join(SCRIPT_DIR, "private_key.pem")
PUBLIC_KEY_PATH = os.path.join(SCRIPT_DIR, "public_key.pem")
LICENSE_FILE = os.path.join(SCRIPT_DIR, "CWULicense.txt")

def generate_keys():
    """Generate RSA private and public keys."""
    if os.path.exists(PRIVATE_KEY_PATH):
        print("[*] Keys already exist.")
        return

    print("[*] Generating new RSA keys...")
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )
    
    # Save Private Key
    with open(PRIVATE_KEY_PATH, "wb") as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ))

    # Save Public Key
    public_key = private_key.public_key()
    with open(PUBLIC_KEY_PATH, "wb") as f:
        f.write(public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ))
    print("[+] Keys generated successfully.")

def load_private_key():
    with open(PRIVATE_KEY_PATH, "rb") as key_file:
        return serialization.load_pem_private_key(
            key_file.read(),
            password=None
        )

def generate_license(customer_name, days_valid=365, license_type="PREMIUM", provided_to="ABC", project="ChatWithUs", version="1.0.0", description="ChatWithUs Enterprise License"):
    """Generate a signed license file in text format."""
    if not os.path.exists(PRIVATE_KEY_PATH):
        generate_keys()

    expiry_date = (datetime.now() + timedelta(days=days_valid)).strftime("%Y-%m-%d")
    issued_at = datetime.now().strftime("%Y-%m-%d")
    
    # Human-readable content
    content = f"""PRODUCT: ChatWithUs
PROJECT: {project}
VERSION: {version}
DESCRIPTION: {description}
COMPANY: {customer_name}
PROVIDED TO: {provided_to}
ISSUED: {issued_at}
VALID UNTIL: {expiry_date}
LICENSE TYPE: {license_type}
"""
    
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
    
    print(f"[+] License generated for {customer_name} (Expires: {expiry_date})")
    print(f"[+] License saved to {LICENSE_FILE}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) < 2:
        print("Usage: python license_generator.py <customer_name> [days_valid] [type] [provided_to] [project] [version] [description]")
        print("Example: python license_generator.py 'Aman Jaiswal' 365 PREMIUM ABC ChatWithUs 1.0.0 'Enterprise Chat'")
    else:
        name = sys.argv[1]
        days = int(sys.argv[2]) if len(sys.argv) > 2 else 365
        ltype = sys.argv[3] if len(sys.argv) > 3 else "PREMIUM"
        provided = sys.argv[4] if len(sys.argv) > 4 else "ABC"
        project = sys.argv[5] if len(sys.argv) > 5 else "ChatWithUs"
        version = sys.argv[6] if len(sys.argv) > 6 else "1.0.0"
        desc = sys.argv[7] if len(sys.argv) > 7 else "ChatWithUs Enterprise License"
        
        generate_license(name, days, ltype, provided, project, version, desc)
