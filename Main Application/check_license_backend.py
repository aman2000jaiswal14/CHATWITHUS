import os
import django
import json

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from chat.services.licensing import LicensingService

def check_license():
    info = LicensingService.get_license_info()
    print("--- LICENSE INFO ---")
    print(json.dumps(info, indent=2))
    print("--- END ---")

if __name__ == "__main__":
    check_license()
