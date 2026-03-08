from django.db import models
from django.conf import settings
from .services.encryption import encryption_service


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
    content = models.TextField()  # Encrypted at rest
    message_type = models.IntegerField(default=0)  # 0: Text, 1: Audio, 2: Override, 4: System
    message_id = models.CharField(max_length=100, unique=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_expired = models.BooleanField(default=False)

    class Meta:
        ordering = ['timestamp']

    @property
    def decrypted_content(self):
        """Returns the decrypted content of the message."""
        return encryption_service.decrypt_payload(self.content)

    def save(self, *args, **kwargs):
        if self.content and not self.content.startswith('[Decryption Error'):
            self.content = encryption_service.encrypt_payload(self.content)
        super().save(*args, **kwargs)

    def __str__(self):
        target = self.group.name if self.group else (self.recipient.username if self.recipient else '?')
        try:
            display_content = self.decrypted_content[:30]
        except:
            display_content = "[Encrypted Content]"
        return f"{self.sender.username} → {target}: {display_content}"


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
    file_name = models.CharField(max_length=500)  # Increased for encrypted string
    file_type = models.CharField(max_length=500)  # Increased for encrypted string
    file_size = models.IntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    is_expired = models.BooleanField(default=False)

    @property
    def decrypted_file_name(self):
        return encryption_service.decrypt_payload(self.file_name)

    @property
    def decrypted_file_type(self):
        return encryption_service.decrypt_payload(self.file_type)

    def save(self, *args, **kwargs):
        if self.file_name and not self.file_name.startswith('[Decryption Error'):
            self.file_name = encryption_service.encrypt_payload(self.file_name)
        if self.file_type and not self.file_type.startswith('[Decryption Error'):
            self.file_type = encryption_service.encrypt_payload(self.file_type)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Attachment for {self.message.message_id}: {self.decrypted_file_name}"
