import json
from chat.services.licensing import LicensingService

def license_context(request):
    """Context processor to provide license info to all templates."""
    info = LicensingService.get_license_info()
    return {
        'CWU_LICENSE_JSON': json.dumps(info) if info else 'null'
    }
