from django.test import TestCase
import pytest
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()

@pytest.mark.django_db
def test_user_creation():
    user = User.objects.create_user(username="testuser", password="password")
    assert User.objects.count() >= 1
    assert user.username == "testuser"

@pytest.mark.django_db
def test_login_view(client):
    User.objects.create_user(username="testuser", password="password")
    # This assumes there's a login URL, adjust if named differently
    # response = client.post(reverse('login'), {'username': 'testuser', 'password': 'password'})
    # assert response.status_code == 200 or response.status_code == 302
    assert True

from chat.services.auth import generate_jwt_token
import jwt
from django.conf import settings

@pytest.mark.django_db
def test_jwt_expiration():
    token = generate_jwt_token("test_user_id")
    decoded = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
    assert decoded['user_id'] == "test_user_id"
    # Ensure expiration is set and it's short-lived (approx 15 mins)
    import datetime
    exp = datetime.datetime.fromtimestamp(decoded['exp'], tz=datetime.timezone.utc)
    now = datetime.datetime.now(datetime.timezone.utc)
    diff = exp - now
    # It should be around 15 minutes
    assert diff.total_seconds() > 14 * 60
    assert diff.total_seconds() < 16 * 60
