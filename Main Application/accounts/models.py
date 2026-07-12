from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=100, default='User')
    is_muted = models.BooleanField(default=True)

    @property
    def jwt_token(self):
        from chat.services.auth import generate_jwt_token
        return generate_jwt_token(self.username)

    def save(self, *args, **kwargs):
        if self.username and self.username.lower() == 'ai_assistant':
            if not getattr(self, '_is_system_ai', False) and not self.pk:
                raise ValueError("The username 'AI_Assistant' is reserved.")
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username
