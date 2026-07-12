from django.db import models

class AIPrivateKey(models.Model):
    # Encrypted PEM private key of the AI assistant (encrypted using django settings SECRET_KEY)
    encrypted_pem = models.TextField()

    def __str__(self):
        return "AI Assistant Private Key (Encrypted)"
