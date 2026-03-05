from django.contrib import admin
from .models import Bookmark, ChatGroup, Message, UserStatus, ChatReadCursor, MessageAttachment


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    list_display = ('user', 'bookmarked_user', 'is_verified', 'created_at')
    list_filter = ('is_verified',)
    search_fields = ('user__username', 'bookmarked_user__username')


@admin.register(ChatGroup)
class ChatGroupAdmin(admin.ModelAdmin):
    list_display = ('name', 'creator', 'member_count', 'admin_count', 'created_at')
    filter_horizontal = ('members', 'admins')
    search_fields = ('name',)

    def member_count(self, obj):
        return obj.members.count()
    member_count.short_description = 'Members'

    def admin_count(self, obj):
        return obj.admins.count()
    admin_count.short_description = 'Admins'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('sender', 'recipient', 'group', 'message_type', 'content_preview', 'timestamp')
    list_filter = ('timestamp', 'group', 'message_type')
    search_fields = ('sender__username', 'recipient__username', 'content')
    readonly_fields = ('timestamp',)

    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Content'


@admin.register(UserStatus)
class UserStatusAdmin(admin.ModelAdmin):
    list_display = ('user', 'status', 'updated_at')
    list_filter = ('status',)
    search_fields = ('user__username',)


@admin.register(ChatReadCursor)
class ChatReadCursorAdmin(admin.ModelAdmin):
    list_display = ('user', 'chat_id', 'is_group', 'last_read_at')
    list_filter = ('is_group', 'last_read_at')
    search_fields = ('user__username', 'chat_id')


@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
    list_display = ('message', 'file_name', 'file_type', 'file_size', 'created_at')
    list_filter = ('file_type', 'created_at')
    search_fields = ('file_name', 'message__message_id')
