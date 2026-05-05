from django.urls import path
from . import views

urlpatterns = [
    path('api/bookmarks/', views.api_bookmarks, name='chat_bookmarks'),
    path('api/bookmarks/add/', views.api_bookmark_add, name='chat_bookmark_add'),
    path('api/bookmarks/remove/', views.api_bookmark_remove, name='chat_bookmark_remove'),
    path('api/bookmarks/verify/', views.api_bookmark_verify, name='chat_bookmark_verify'),
    path('api/users/', views.api_all_users, name='chat_all_users'),
    path('api/groups/', views.api_groups, name='chat_groups'),
    path('api/groups/create/', views.api_group_create, name='chat_group_create'),
    path('api/groups/<int:group_id>/add_member/', views.api_group_add_member, name='chat_group_add_member'),
    path('api/groups/<int:group_id>/remove_member/', views.api_group_remove_member, name='chat_group_remove_member'),
    path('api/groups/<int:group_id>/members/', views.api_group_members, name='chat_group_members'),
    path('api/groups/<int:group_id>/leave/', views.api_group_leave, name='chat_group_leave'),
    path('api/groups/<int:group_id>/make_admin/', views.api_group_make_admin, name='chat_group_make_admin'),
    path('api/groups/<int:group_id>/rename/', views.api_group_rename, name='chat_group_rename'),
    path('api/history/<str:chat_id>/', views.api_chat_history, name='chat_history'),
    path('api/export/<str:chat_id>/', views.api_export_messages, name='chat_export'),
    path('api/status/set/', views.api_set_status, name='chat_set_status'),
    path('api/status/', views.api_get_statuses, name='chat_get_statuses'),
    path('api/mark_read/', views.api_mark_read, name='chat_mark_read'),
    path('api/track_receipt/', views.api_track_receipt, name='chat_track_receipt'),
    path('api/upload/', views.api_upload_attachment, name='chat_upload_attachment'),
    path('api/register/', views.api_register, name='chat_register'),
    path('api/settings/mute/', views.api_mute_settings, name='chat_mute_settings'),
    path('api/auth/token/', views.api_generate_token, name='chat_generate_token'),
]
