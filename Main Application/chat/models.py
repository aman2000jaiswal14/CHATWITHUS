from django.db import models
from django.conf import settings


class Bookmark(models.Model):
    """A user's bookmarked contacts for Direct Comm."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookmarks'
    )
    bookmarked_user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='bookmarked_by'
    )
    is_verified = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'bookmarked_user')

    def __str__(self):
        tag = '' if self.is_verified else ' [unverified]'
        return f"{self.user.username} → {self.bookmarked_user.username}{tag}"


class ChatGroup(models.Model):
    """A chat group with members and multiple admins."""
    name = models.CharField(max_length=100)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_groups'
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='chat_groups',
        blank=True
    )
    admins = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='admin_of_groups',
        blank=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name


class Message(models.Model):
    """Persisted chat message for history retrieval."""
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='received_messages',
        null=True, blank=True
    )
    group = models.ForeignKey(
        'ChatGroup',
        on_delete=models.CASCADE,
        related_name='messages',
        null=True, blank=True
    )
    content = models.TextField()
    message_type = models.IntegerField(default=0)  # 0: Text, 1: Audio, 2: Override, 4: System
    message_id = models.CharField(max_length=100, unique=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        target = self.group.name if self.group else (self.recipient.username if self.recipient else '?')
        return f"{self.sender.username} → {target}: {self.content[:30]}"


class UserStatus(models.Model):
    """Persisted user activity status."""
    STATUS_CHOICES = [
        (0, 'Online'),
        (1, 'Away'),
        (2, 'Sleeping'),
        (3, 'Working'),
    ]
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chat_status'
    )
    status = models.IntegerField(choices=STATUS_CHOICES, default=0)
    is_online = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.user.username}: {self.get_status_display()}"


class ChatReadCursor(models.Model):
    """Tracks when a user last read a particular chat (DM or group)."""
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='read_cursors'
    )
    chat_id = models.CharField(max_length=150)  # username for DM, group ID for groups
    is_group = models.BooleanField(default=False)
    last_read_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'chat_id', 'is_group')

    def __str__(self):
        return f"{self.user.username} read {self.chat_id} at {self.last_read_at}"


class MessageAttachment(models.Model):
    """Metadata for a file attached to a message."""
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    file = models.FileField(upload_to='chat_attachments/%Y/%m/%d/')
    file_name = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100)
    file_size = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Attachment for {self.message.message_id}: {self.file_name}"
