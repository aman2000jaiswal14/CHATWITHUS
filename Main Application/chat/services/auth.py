import jwt
import datetime
from django.conf import settings

def generate_jwt_token(user_id, expiration_minutes=15):
    """Generate a signed JWT token for a given user."""
    payload = {
        'user_id': str(user_id),
        'exp': datetime.datetime.utcnow() + datetime.timedelta(minutes=expiration_minutes),
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

import os
import hmac
import hashlib
from django.core.cache import cache

HOST_PUBLIC_KEY_PATH = os.path.join(settings.BASE_DIR, "keys", "host_public_key.pem")
HOST_PUBLIC_KEY = None
if os.path.exists(HOST_PUBLIC_KEY_PATH):
    with open(HOST_PUBLIC_KEY_PATH, "r") as f:
        HOST_PUBLIC_KEY = f.read()

def verify_host_identity_token(identity_token):
    """
    Verify asymmetric RSA identity token signed by host application.
    Enforces:
      - RS256 signature verification with host public key
      - Audience check ("chatwithus")
      - Expiration validation with 60-second clock skew leeway
      - Single-use nonce (jti) anti-replay check
    Returns username (sub) if valid, None otherwise.
    """
    if not identity_token or not HOST_PUBLIC_KEY:
        return None

    try:
        payload = jwt.decode(
            identity_token,
            HOST_PUBLIC_KEY,
            algorithms=["RS256"],
            audience="chatwithus",
            leeway=60  # 60s leeway for clock drift in isolated/air-gapped networks
        )

        # Anti-replay protection via single-use jti nonce
        jti = payload.get("jti")
        if not jti:
            print("[Auth] Identity token missing jti nonce")
            return None

        nonce_cache_key = f"cwu_used_nonce_{jti}"
        if cache.get(nonce_cache_key):
            print(f"[Auth REPLAY DETECTED] Nonce {jti} already used!")
            return None

        # Burn nonce in cache for 600s (10 mins, well past token expiration)
        cache.set(nonce_cache_key, 1, timeout=600)

        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        print("[Auth] Host identity token expired")
        return None
    except jwt.InvalidTokenError as e:
        print(f"[Auth] Host identity token invalid: {e}")
        return None
