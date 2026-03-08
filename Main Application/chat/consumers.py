import base64
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .protocols import messages_pb2
from .handlers.message_handler import MessageHandler
from .services.licensing import LicensingService
import time
import re


class ChatConsumer(AsyncWebsocketConsumer):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.message_handler = MessageHandler()
        self.joined_groups = set()
        self.user_id = None
        self.license_info = None

    @database_sync_to_async
    def fetch_license(self):
        return LicensingService.get_license_info()

    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.personal_group = f'user_{self.user_id}'
        self.license_info = await self.fetch_license()

        await self.channel_layer.group_add(
            self.personal_group,
            self.channel_name
        )
        self.joined_groups.add(self.personal_group)

        await self.accept()
        print(f"[WS CONNECTED] user={self.user_id}")

        # Update and broadcast online status
        await self.update_user_online_status(True)
        await self.broadcast_presence(is_connecting=True)

    async def disconnect(self, close_code):
        print(f"[WS DISCONNECTED] user={self.user_id}")
        
        # Update and broadcast offline status
        await self.update_user_online_status(False)
        await self.broadcast_presence(is_connecting=False)

        for group in self.joined_groups:
            await self.channel_layer.group_discard(group, self.channel_name)

    async def receive(self, text_data=None, bytes_data=None):
        if bytes_data:
            wrapper = messages_pb2.ProtocolWrapper()
            try:
                wrapper.ParseFromString(bytes_data)

                if wrapper.HasField('chat_message'):
                    message = wrapper.chat_message
                    
                    # Prevent sender impersonation IDOR
                    if message.sender_id != self.user_id:
                        print(f"[AUTH WARN] Enforcing sender_id to {self.user_id} (attempted {message.sender_id})")
                        message.sender_id = self.user_id

                    # Prevent unauthorized group message injection IDOR
                    if message.is_group_message:
                        is_member = await self.is_user_in_group(self.user_id, message.target_id)
                        if not is_member:
                            print(f"[AUTH ERROR] User {self.user_id} attempted to message group {message.target_id} without membership")
                            return

                    # Skip Allowed Characters filtering on the backend because 
                    # message.content is an End-To-End Encrypted Base64 ciphertext!
                    # The strict constraints are enforced on the React Client locally before encryption.

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
                        is_member = await self.is_user_in_group(self.user_id, command.target_id)
                        if is_member:
                            await self.channel_layer.group_add(target_group, self.channel_name)
                            self.joined_groups.add(target_group)
                        else:
                            print(f"[AUTH ERROR] User {self.user_id} attempted to subscribe to group {command.target_id} without membership")
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
            'is_online': event.get('is_online', True)
        }))

    @database_sync_to_async
    def update_user_online_status(self, is_online):
        from .models import UserStatus
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            user = User.objects.get(username=self.user_id)
            UserStatus.objects.update_or_create(
                user=user,
                defaults={'is_online': is_online}
            )
        except User.DoesNotExist:
            print(f"[WS] User not found during status update: {self.user_id}")
        except Exception as e:
            print(f"[WS] Error updating status for {self.user_id}: {e}")

    @database_sync_to_async
    def get_user_status_info(self, username):
        from .models import UserStatus
        try:
            us = UserStatus.objects.get(user__username=username)
            return {'status': us.status, 'is_online': us.is_online}
        except UserStatus.DoesNotExist:
            return {'status': 0, 'is_online': False}

    async def broadcast_presence(self, is_connecting=True):
        """Broadcast user status to all contacts."""
        if not self.user_id:
            return
            
        # Get status from DB
        status_info = await self.get_user_status_info(self.user_id)
        
        payload = {
            'type': 'presence_update',
            'user_id': self.user_id,
            'status': status_info['status'] if status_info['is_online'] else None,
            'is_online': status_info['is_online']
        }
        
        contact_ids = await self.get_contact_user_ids(self.user_id)
        for uid in contact_ids:
            await self.channel_layer.group_send(
                f'user_{uid}',
                payload
            )

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
        from .models import Message as DBMessage, ChatGroup, MessageAttachment
        from django.conf import settings
        from django.utils import timezone
        import datetime
        User = get_user_model()

        try:
            sender = User.objects.get(username=message.sender_id)
            content = message.payload.decode('utf-8', errors='replace')
            
            # Module 1: Self-Destruct Timers
            expires_at = None
            if hasattr(message, 'timer_seconds') and message.timer_seconds > 0:
                expires_at = timezone.now() + datetime.timedelta(seconds=message.timer_seconds)
            else:
                expires_at = timezone.now() + datetime.timedelta(seconds=settings.GLOBAL_MESSAGE_EXPIRATION_SECONDS)

            if message.is_group_message:
                try:
                    group = ChatGroup.objects.get(id=int(message.target_id))
                    db_message, created = DBMessage.objects.get_or_create(
                        message_id=message.message_id,
                        defaults={
                            'sender': sender,
                            'group': group,
                            'content': content,
                            'expires_at': expires_at,
                        }
                    )
                    # Handle attachment
                    if message.HasField('attachment'):
                        MessageAttachment.objects.get_or_create(
                            message=db_message,
                            defaults={
                                'file_name': message.attachment.name,
                                'file': message.attachment.url.replace('/media/', ''),
                                'file_type': message.attachment.type,
                                'file_size': message.attachment.size,
                                'expires_at': expires_at,
                            }
                        )
                except (ChatGroup.DoesNotExist, ValueError):
                    pass
            else:
                try:
                    recipient = User.objects.get(username=message.target_id)
                    db_message, created = DBMessage.objects.get_or_create(
                        message_id=message.message_id,
                        defaults={
                            'sender': sender,
                            'recipient': recipient,
                            'content': content,
                            'expires_at': expires_at,
                        }
                    )
                    # Handle attachment
                    if message.HasField('attachment'):
                        MessageAttachment.objects.get_or_create(
                            message=db_message,
                            defaults={
                                'file_name': message.attachment.name,
                                'file': message.attachment.url.replace('/media/', ''),
                                'file_type': message.attachment.type,
                                'file_size': message.attachment.size,
                                'expires_at': expires_at,
                            }
                        )
                except User.DoesNotExist:
                    pass
        except User.DoesNotExist:
            print(f"[DB SAVE] Sender not found: {message.sender_id}")
        except Exception as e:
            print(f"[DB SAVE ERROR] {e}")
            import traceback
            traceback.print_exc()

    @database_sync_to_async
    def is_user_in_group(self, username, group_id):
        from .models import ChatGroup
        try:
            group = ChatGroup.objects.get(id=int(group_id))
            return group.members.filter(username=username).exists()
        except (ChatGroup.DoesNotExist, ValueError):
            return False
