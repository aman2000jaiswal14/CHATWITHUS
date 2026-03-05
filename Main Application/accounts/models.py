from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    name = models.CharField(max_length=255)
    role = models.CharField(max_length=100, default='User')

    def __str__(self):
        return self.username
