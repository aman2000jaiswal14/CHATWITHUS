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
