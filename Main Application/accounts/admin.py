from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

class CustomUserAdmin(UserAdmin):
    model = User
    list_display = ['username', 'email', 'name', 'role', 'is_muted', 'is_staff']
    fieldsets = UserAdmin.fieldsets + (
        (None, {'fields': ('name', 'role', 'is_muted')}),
    )
    add_fieldsets = UserAdmin.add_fieldsets + (
        (None, {'fields': ('name', 'role', 'is_muted')}),
    )

admin.site.register(User, CustomUserAdmin)
