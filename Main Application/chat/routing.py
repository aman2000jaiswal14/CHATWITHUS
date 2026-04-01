from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # New prefixed path for Nginx
    re_path(r'chat/ws/chat/(?P<user_id>\w+)/$', consumers.ChatConsumer.as_asgi()),
    # Legacy path for direct connections during migration
    re_path(r'ws/chat/(?P<user_id>\w+)/$', consumers.ChatConsumer.as_asgi()),
]
