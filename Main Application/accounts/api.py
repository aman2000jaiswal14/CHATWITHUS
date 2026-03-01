from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.contrib.auth import get_user_model

User = get_user_model()

@login_required
def api_users(request):
    """
    Returns a JSON list of all registered users (excluding the requesting user).
    Used by the Chat Widget to populate the contacts sidebar.
    """
    users = User.objects.exclude(id=request.user.id).values(
        'id', 'username', 'name', 'role'
    )
    return JsonResponse({
        'users': list(users),
        'current_user': {
            'id': request.user.id,
            'username': request.user.username,
            'name': request.user.name or request.user.username,
            'role': request.user.role,
        }
    })
