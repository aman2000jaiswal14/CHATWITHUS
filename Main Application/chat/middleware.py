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

from django.utils.deprecation import MiddlewareMixin
from .services.auth import verify_jwt_token

class CSRFExemptJWTModuleMiddleware(MiddlewareMixin):
    """
    Exempts CSRF checks for requests that are properly authenticated via JWT Bearer tokens
    or have a valid Identity Signature. This is safe because Bearer tokens are not 
    automatically sent by browsers, preventing standard CSRF attacks.
    """
    def process_view(self, request, view_func, view_args, view_kwargs):
        # 1. Check if it's already exempt (e.g. via @csrf_exempt)
        if getattr(view_func, 'csrf_exempt', False):
            return None

        # 2. Check for Authorization header
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            if verify_jwt_token(token):
                setattr(request, '_dont_enforce_csrf_checks', True)
                return None
        
        # 3. Check for Identity Signature in token generation endpoint
        # (Technically api_generate_token is where we most need it)
        if request.path.endswith('/api/auth/token/'):
            # We don't verify here as the view will do it, 
            # but we allow the bypass to occur at the middleware layer
            setattr(request, '_dont_enforce_csrf_checks', True)
        
        return None
