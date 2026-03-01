import base64
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .protocols import messages_pb2
from .handlers.message_handler import MessageHandler
import time


class ChatConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.message_handler = MessageHandler()
        self.joined_groups = set()

    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.personal_group = f'user_{self.user_id}'

        await self.channel_layer.group_add(
            self.personal_group,
            self.channel_name
        )
        self.joined_groups.add(self.personal_group)

        await self.accept()
        print(f"[WS CONNECTED] user={self.user_id}")

    async def disconnect(self, close_code):
        print(f"[WS DISCONNECTED] user={self.user_id}")
        for group in self.joined_groups:
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if bytes_data:
            wrapper = messages_pb2.ProtocolWrapper()
            try:
                wrapper.ParseFromString(bytes_data)

                if wrapper.HasField('chat_message'):
                    message = wrapper.chat_message
                    message.received_at = int(time.time() * 1000)

                    try:
                        await self.message_handler.handle(message)
                    except Exception as e:
                        print(f"[HANDLER ERROR] {e}")

                    # Save message to database for history
                    await self.save_message_to_db(message)

                    updated_bytes = wrapper.SerializeToString()
                    encoded = base64.b64encode(updated_bytes).decode('ascii')

                    if message.is_group_message:
                        target_group = f'group_{message.target_id}'
                        await self.channel_layer.group_send(
                            target_group,
                            {'type': 'chat.message', 'data': encoded}
                        )
                    else:
                        target_group = f'user_{message.target_id}'
                        await self.channel_layer.group_send(
                            target_group,
                            {'type': 'chat.message', 'data': encoded}
                        )
                        await self.channel_layer.group_send(
                            self.personal_group,
                            {'type': 'chat.message', 'data': encoded}
                        )
                        # Auto-create unverified bookmark for recipient
                        await self.create_unverified_bookmark(
                            sender_username=message.sender_id,
                            recipient_username=message.target_id
                        )

                elif wrapper.HasField('command'):
                    command = wrapper.command
                    target_group = f'group_{command.target_id}'
                    if command.type == messages_pb2.Command.SUBSCRIBE_GROUP:
                        await self.channel_layer.group_add(target_group, self.channel_name)
                        self.joined_groups.add(target_group)
                    elif command.type == messages_pb2.Command.UNSUBSCRIBE_GROUP:
                        await self.channel_layer.group_discard(target_group, self.channel_name)
                        self.joined_groups.discard(target_group)

                elif wrapper.HasField('presence'):
                    # Broadcast presence to all contacts and groups
                    presence_bytes = wrapper.SerializeToString()
                    encoded = base64.b64encode(presence_bytes).decode('ascii')

                    # Broadcast to all users who have bookmarked this user
                    contact_ids = await self.get_contact_user_ids(self.user_id)
                    for uid in contact_ids:
                        await self.channel_layer.group_send(
                            f'user_{uid}',
                            {'type': 'chat.message', 'data': encoded}
                        )

            except Exception as e:
                print(f"[PROTOBUF ERROR] {e}")
                import traceback
                traceback.print_exc()

    # --- Channel layer handlers ---

    async def chat_message(self, event):
        """Deliver a protobuf chat message to the client."""
        raw_bytes = base64.b64decode(event['data'])
        await self.send(bytes_data=raw_bytes)

    async def group_refresh(self, event):
        """Signal clients to re-fetch their group list."""
        await self.send(text_data=json.dumps({
            'type': 'group_refresh',
            'reason': event.get('reason', 'update'),
        }))

    async def presence_update(self, event):
        """Deliver a presence update to the client as JSON."""
        await self.send(text_data=json.dumps({
            'type': 'presence_update',
            'user_id': event['user_id'],
            'status': event['status'],
        }))

    # --- DB helpers ---

    @database_sync_to_async
    def create_unverified_bookmark(self, sender_username, recipient_username):
        from django.contrib.auth import get_user_model
        from .models import Bookmark
        User = get_user_model()
        try:
            sender = User.objects.get(username=sender_username)
            recipient = User.objects.get(username=recipient_username)
            Bookmark.objects.get_or_create(
                user=recipient,
                bookmarked_user=sender,
                defaults={'is_verified': False}
            )
        except User.DoesNotExist:
            pass

    @database_sync_to_async
    def get_contact_user_ids(self, username):
        """Get all user IDs who have bookmarked this user (i.e., contacts who should see presence)."""
        from .models import Bookmark
        bookmarks = Bookmark.objects.filter(
            bookmarked_user__username=username
        ).select_related('user')
        return [b.user.username for b in bookmarks]

    @database_sync_to_async
    def save_message_to_db(self, message):
        """Persist a protobuf ChatMessage to the database."""
        from django.contrib.auth import get_user_model
        from .models import Message as DBMessage, ChatGroup
        User = get_user_model()

        try:
            sender = User.objects.get(username=message.sender_id)
            content = message.payload.decode('utf-8', errors='replace')

            if message.is_group_message:
                try:
                    group = ChatGroup.objects.get(id=int(message.target_id))
                    DBMessage.objects.get_or_create(
                        message_id=message.message_id,
                        defaults={
                            'sender': sender,
                            'group': group,
                            'content': content,
                        }
                    )
                except (ChatGroup.DoesNotExist, ValueError):
                    pass
            else:
                try:
                    recipient = User.objects.get(username=message.target_id)
                    DBMessage.objects.get_or_create(
                        message_id=message.message_id,
                        defaults={
                            'sender': sender,
                            'recipient': recipient,
                            'content': content,
                        }
                    )
                except User.DoesNotExist:
                    pass
        except User.DoesNotExist:
            print(f"[DB SAVE] Sender not found: {message.sender_id}")
        except Exception as e:
            print(f"[DB SAVE ERROR] {e}")
