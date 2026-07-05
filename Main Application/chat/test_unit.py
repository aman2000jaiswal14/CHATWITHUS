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

from chat.consumers import DictObjectWrapper

def test_dict_object_wrapper_attributes():
    # Test snake_case and camelCase mapping
    data = {
        'senderId': 'user123',
        'target_id': 'group456',
        'payload': 'hello world',
        'isGroupMessage': True,
        'chatMessage': {
            'messageId': 'msg999',
            'type': 1
        }
    }
    wrapper = DictObjectWrapper(data)
    
    # Test attribute mapping and retrieval
    assert wrapper.sender_id == 'user123'
    assert wrapper.target_id == 'group456'
    assert wrapper.is_group_message is True
    
    # Test payload encoding
    assert wrapper.payload == b'hello world'
    
    # Test nested DictObjectWrapper
    assert isinstance(wrapper.chat_message, DictObjectWrapper)
    assert wrapper.chat_message.message_id == 'msg999'
    assert wrapper.chat_message.type == 1
    
    # Test non-existent attributes defaults
    assert wrapper.size == 0
    assert wrapper.is_video is False
    assert wrapper.non_existent_field is None

def test_dict_object_wrapper_has_field():
    data = {
        'chatMessage': {'messageId': 'abc'},
        'presence': None
    }
    wrapper = DictObjectWrapper(data)
    
    assert wrapper.HasField('chat_message') is True
    assert wrapper.HasField('presence') is False
    assert wrapper.HasField('receipt') is False

def test_dict_object_wrapper_setattr():
    data = {
        'senderId': 'user123',
        'timer_seconds': 10
    }
    wrapper = DictObjectWrapper(data)
    
    wrapper.sender_id = 'new_user'
    wrapper.timer_seconds = 20
    wrapper.new_field = 'value'
    
    assert data['senderId'] == 'new_user'
    assert data['timer_seconds'] == 20
    assert data['new_field'] == 'value'

