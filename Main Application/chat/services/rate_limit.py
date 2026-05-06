from django.core.cache import cache

class SessionRateLimiter:
    """
    Simple rate limiter that tracks hits per session ID or User ID.
    Enforces a strict '15 messages per session' limit as requested.
    """
    @staticmethod
    def is_allowed(session_id, limit=15):
        key = f"rate_limit_msgs_{session_id}"
        count = cache.get(key, 0)
        
        if count >= limit:
            return False
            
        cache.set(key, count + 1, timeout=3600) # Expire counter after 1 hour of inactivity
        return True

    @staticmethod
    def get_count(session_id):
        return cache.get(f"rate_limit_msgs_{session_id}", 0)
