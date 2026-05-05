#!/usr/bin/env python3
import sys
import os
import django

# Setup django environment to access settings.SECRET_KEY
sys.path.append(os.path.join(os.path.dirname(__file__), '../Main Application'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'chatapp.settings')
django.setup()

from chat.services.auth import generate_jwt_token

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python generate_test_token.py <username>")
        sys.exit(1)
        
    username = sys.argv[1]
    token = generate_jwt_token(username)
    print(f"\nGenerated Token for user '{username}':\n")
    print(token)
    print("\nCopy and paste this into CHAT_CONFIG.TOKEN in indexSample.html\n")
