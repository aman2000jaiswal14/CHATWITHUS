from django.http import JsonResponse
from chat.services.licensing import LicensingService
import json

class LicenseEnforcementMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Paths that don't require license check (e.g. login, static, health)
        exempt_paths = [
            '/accounts/login/', 
            '/accounts/logout/', 
            '/admin/',
            '/favicon.ico'
        ]
        
        # Only check chat-related API and views
        if request.path.startswith('/chat/') and not any(request.path.startswith(p) for p in exempt_paths):
            if not LicensingService.is_valid():
                license_info = LicensingService.get_license_info()
                error_msg = "Invalid or missing license. Please contact support."
                if license_info and "error" in license_info:
                    error_msg = f"License Error: {license_info['error']}"
                
                if request.headers.get('x-requested-with') == 'XMLHttpRequest' or request.path.startswith('/chat/api/'):
                    return JsonResponse({'error': 'license_required', 'message': error_msg}, status=403)
                
                # For regular views, we can either redirect or return an error
                # return render(request, 'license_error.html', {'message': error_msg})
        
        return self.get_response(request)
