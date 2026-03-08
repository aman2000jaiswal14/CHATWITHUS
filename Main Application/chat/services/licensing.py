import json
import base64
import os
from datetime import datetime
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives import serialization
from django.conf import settings

# Path to the public key (relative to the project root)
# The public key should be accessible by the app
PUBLIC_KEY_PATH = os.path.join(settings.BASE_DIR, "..", "CWU", "public_key.pem")
LICENSE_FILE_PATH = os.path.join(settings.BASE_DIR, "..", "CWU", "CWULicense.txt")

class LicensingService:
    @classmethod
    def get_license_info(cls):
        """Verify and return license info. Returns None if invalid/missing."""
        # Removed caching to ensure we always reflect the current file state correctly
        
        if not os.path.exists(LICENSE_FILE_PATH) or not os.path.exists(PUBLIC_KEY_PATH):
            return {"error": "License file or public key missing"}

        try:
            with open(LICENSE_FILE_PATH, "r") as f:
                lines = f.readlines()

            # Parse text format
            license_data = {}
            signature_b64 = None
            content_lines = []
            
            in_header = False
            for line in lines:
                line = line.strip()
                if line == "--- CHAT WITH US LICENSE ---":
                    in_header = True
                    continue
                if line == "--- END ---":
                    break
                
                if in_header:
                    if line.startswith("SIGNATURE: "):
                        signature_b64 = line.replace("SIGNATURE: ", "")
                        license_data["SIGNATURE"] = signature_b64
                    elif ": " in line:
                        content_lines.append(line)
                        key, val = line.split(": ", 1)
                        license_data[key] = val

            if not signature_b64 or not license_data:
                return {"error": "Incomplete license data"}

            # Content for verification (MUST exactly match what was signed)
            content_to_verify = "\n".join(content_lines).encode('utf-8')
            signature = base64.b64decode(signature_b64)

            # Load Public Key
            with open(PUBLIC_KEY_PATH, "rb") as key_file:
                public_key = serialization.load_pem_public_key(key_file.read())

            # Verify Signature
            public_key.verify(
                signature,
                content_to_verify,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=32 # Standardized to 32
                ),
                hashes.SHA256()
            )

            # Check Expiration
            expiry = datetime.strptime(license_data["VALID UNTIL"], "%Y-%m-%d")
            # Set time for fair comparison
            if datetime.now().replace(hour=0, minute=0, second=0, microsecond=0) > expiry:
                return {"error": "License expired", "expired": True}

            return license_data

        except Exception as e:
            # We don't want to swallow errors during verification
            return {"error": str(e)}

    @classmethod
    def is_valid(cls):
        info = cls.get_license_info()
        return info is not None and "error" not in info
