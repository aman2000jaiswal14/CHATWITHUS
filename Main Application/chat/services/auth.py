import jwt
import datetime
from django.conf import settings

def generate_jwt_token(user_id, expiration_days=30):
    """Generate a signed JWT token for a given user."""
    payload = {
        'user_id': str(user_id),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(days=expiration_days),
        'iat': datetime.datetime.utcnow()
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')

def verify_jwt_token(token):
    """
    Verify the token signature and expiration.
    Returns the user_id if valid, None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        return payload.get('user_id')
    except jwt.ExpiredSignatureError:
        print("[Auth] Token expired")
        return None
    except jwt.InvalidTokenError:
        print("[Auth] Invalid token")
        return None

import hmac
import hashlib

def verify_hmac_signature(username, signature):
    """
    Verify the identity signature provided by the host application.
    The host signs the username using HMAC-SHA256 with the Django SECRET_KEY.
    """
    if not signature:
        return False
    expected = hmac.new(
        settings.SECRET_KEY.encode('utf-8'),
        username.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)
