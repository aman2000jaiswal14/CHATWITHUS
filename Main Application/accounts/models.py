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

    def __str__(self):
        return self.username
