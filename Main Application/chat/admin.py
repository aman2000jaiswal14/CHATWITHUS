from django.contrib import admin
from .models import Bookmark, ChatGroup


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
