import base64
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .protocols import messages_pb2
from .handlers.message_handler import MessageHandler
from .services.licensing import LicensingService
import time
import re


class DictObjectWrapper:
    def __init__(self, data):
        self._data = data if isinstance(data, dict) else {}
        self._cache = {}

    def __getattr__(self, name):
        mapping = {
            'sender_id': ['sender_id', 'senderId'],
            'target_id': ['target_id', 'targetId'],
            'is_group_message': ['is_group_message', 'isGroupMessage'],
            'timer_seconds': ['timer_seconds', 'timerSeconds'],
            'reply_to_message_id': ['reply_to_message_id', 'replyToMessageId'],
            'received_at': ['received_at', 'receivedAt'],
            'is_group': ['is_group', 'isGroup'],
            'chat_id': ['chat_id', 'chatId'],
            'reader_id': ['reader_id', 'readerId'],
            'message_id': ['message_id', 'messageId'],
            'sdp': ['sdp'],
            'candidate': ['candidate'],
            'call_id': ['call_id', 'callId'],
            'is_video': ['is_video', 'isVideo'],
            'url': ['url'],
            'size': ['size'],
            'name': ['name'],
            'id': ['id'],
            'type': ['type'],
        }
        
        keys = mapping.get(name, [name])
        val = None
        found = False
        for k in keys:
            if k in self._data:
                val = self._data[k]
                found = True
                break

        if not found:
            camel = re.sub(r'_([a-z])', lambda match: match.group(1).upper(), name)
            if camel in self._data:
                val = self._data[camel]
                found = True

        if not found:
            snake = re.sub(r'(?<!^)(?=[A-Z])', '_', name).lower()
            if snake in self._data:
                val = self._data[snake]
                found = True

        if not found:
            if name in ['type', 'timer_seconds', 'size']:
                return 0
            if name in ['is_group_message', 'is_group', 'is_video']:
                return False
            return None

        if name == 'payload':
            if isinstance(val, str):
                return val.encode('utf-8')
            elif isinstance(val, bytes):
                return val
            elif isinstance(val, bytearray):
                return bytes(val)
            return b''

        if isinstance(val, dict):
            if name not in self._cache:
                self._cache[name] = DictObjectWrapper(val)
            return self._cache[name]

        return val

    def __setattr__(self, name, value):
        if name in ('_data', '_cache'):
            super().__setattr__(name, value)
            return

        mapping = {
            'sender_id': ['sender_id', 'senderId'],
            'target_id': ['target_id', 'targetId'],
            'is_group_message': ['is_group_message', 'isGroupMessage'],
            'timer_seconds': ['timer_seconds', 'timerSeconds'],
            'reply_to_message_id': ['reply_to_message_id', 'replyToMessageId'],
            'received_at': ['received_at', 'receivedAt'],
            'is_group': ['is_group', 'isGroup'],
            'chat_id': ['chat_id', 'chatId'],
            'reader_id': ['reader_id', 'readerId'],
            'message_id': ['message_id', 'messageId'],
            'sdp': ['sdp'],
            'candidate': ['candidate'],
            'call_id': ['call_id', 'callId'],
            'is_video': ['is_video', 'isVideo'],
            'url': ['url'],
            'size': ['size'],
            'name': ['name'],
            'id': ['id'],
            'type': ['type'],
        }

        keys = mapping.get(name, [name])
        target_key = keys[0]
        for k in keys:
            if k in self._data:
                target_key = k
                break

        self._data[target_key] = value

    def HasField(self, field_name):
        mapping = {
            'chat_message': ['chat_message', 'chatMessage'],
            'presence': ['presence'],
            'command': ['command'],
            'receipt': ['receipt'],
            'webrtc_signal': ['webrtc_signal', 'webrtcSignal'],
            'attachment': ['attachment'],
        }
        keys = mapping.get(field_name, [field_name])
        for k in keys:
            if k in self._data and self._data[k] is not None:
                return True
        return False




class ChatConsumer(AsyncWebsocketConsumer):
    # Class-level tracker: maps user_id → set of channel_names
    # Shared across all instances in this process.
    _active_sessions = {}

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
        query_string = self.scope.get('query_string', b'').decode('utf-8')
        token = None
        for param in query_string.split('&'):
            if param.startswith('token='):
                token = param.split('=')[1]
                break
                
        if not token:
            print("[WS AUTH ERROR] No token provided")
            await self.close(code=4003)
            return
            
        from .services.auth import verify_jwt_token
        verified_username = verify_jwt_token(token)
        if not verified_username:
            print("[WS AUTH ERROR] Invalid or expired token")
            await self.close(code=4003)
            return
            
        expected_user_id = self.scope['url_route']['kwargs']['user_id']
        if str(verified_username) != str(expected_user_id):
            print(f"[WS AUTH ERROR] User ID mismatch. URL: {expected_user_id}, Token: {verified_username}")
            await self.close(code=4003)
            return

        self.user_id = verified_username
        self.personal_group = f'user_{self.user_id}'
        self.license_info = await self.fetch_license()

        await self.channel_layer.group_add(
            self.personal_group,
            self.channel_name
        )
        self.joined_groups.add(self.personal_group)

        # Join the global broadcast group for Emergency Alerts
        await self.channel_layer.group_add(
            'all_users',
            self.channel_name
        )
        self.joined_groups.add('all_users')

        await self.accept()

        # Register this session in the class-level tracker
        if self.user_id not in ChatConsumer._active_sessions:
            ChatConsumer._active_sessions[self.user_id] = set()
        ChatConsumer._active_sessions[self.user_id].add(self.channel_name)
        session_count = len(ChatConsumer._active_sessions[self.user_id])
        print(f"[WS CONNECTED] user={self.user_id} (sessions: {session_count})")

        # Update and broadcast online status
        await self.update_user_online_status(True)
        await self.broadcast_presence(is_connecting=True)

    async def disconnect(self, close_code):
        # Unregister this session from the class-level tracker
        if self.user_id and self.user_id in ChatConsumer._active_sessions:
            ChatConsumer._active_sessions[self.user_id].discard(self.channel_name)
            remaining = len(ChatConsumer._active_sessions[self.user_id])
            if remaining == 0:
                del ChatConsumer._active_sessions[self.user_id]
        else:
            remaining = 0

        print(f"[WS DISCONNECTED] user={self.user_id} (remaining sessions: {remaining})")

        # Only mark offline and broadcast if NO sessions remain for this user
        if remaining == 0:
            await self.update_user_online_status(False)
            await self.broadcast_presence(is_connecting=False)

        for group in self.joined_groups:
            await self.channel_layer.group_discard(group, self.channel_name)

    def has_protobuf(self):
        modules = self.license_info.get('MODULES', '') if self.license_info else ''
        return 'PROTOBUF' in modules

    async def receive(self, text_data=None, bytes_data=None):
        wrapper = None
        if bytes_data:
            pb_wrapper = messages_pb2.ProtocolWrapper()
            try:
                pb_wrapper.ParseFromString(bytes_data)
                wrapper = pb_wrapper
            except Exception as e:
                print(f"[PROTOBUF ERROR] {e}")
                return
        elif text_data:
            try:
                data = json.loads(text_data)
                wrapper = DictObjectWrapper(data)
            except Exception as e:
                print(f"[JSON ERROR] {e}")
                return
        else:
            return

        try:
            if wrapper.HasField('chat_message'):
                message = wrapper.chat_message
                
                # Rate limiting (user-based)
                from .services.rate_limit import SessionRateLimiter
                from django.conf import settings
                limit = getattr(settings, 'WS_RATE_LIMIT', 10000)
                if not SessionRateLimiter.is_allowed(f"ws_session_{self.user_id}", limit=limit):
                    print(f"[RATE LIMIT] User {self.user_id} exceeded session limit.")
                    return

                # Prevent sender impersonation IDOR
                if message.sender_id != self.user_id:
                    print(f"[AUTH WARN] Enforcing sender_id to {self.user_id} (attempted {message.sender_id})")
                    message.sender_id = self.user_id

                # License check for Reply feature
                if message.reply_to_message_id:
                    modules = self.license_info.get('MODULES', '') if self.license_info else ''
                    if 'REPLY' not in modules:
                        print(f"[LICENSE ERROR] User {self.user_id} attempted to reply without REPLY module license")
                        return

                # Check if this is an emergency broadcast BEFORE group membership check
                is_emergency = message.target_id.upper() == "EMERGENCY"

                if is_emergency:
                    # Validate Commander role for Broadcasts
                    user_role = await self.get_user_role(self.user_id)
                    if user_role.lower() not in ["commander", "admin"]:
                        print(f"[AUTH ERROR] User {self.user_id} attempted to broadcast without Commander/Admin role (has {user_role})")
                        return
                    
                    # Normalize target_id and force is_group_message for consistency
                    message.target_id = "EMERGENCY"
                    message.is_group_message = True
                elif message.is_group_message:
                    # Prevent unauthorized group message injection IDOR
                    is_member = await self.is_user_in_group(self.user_id, message.target_id)
                    if not is_member:
                        print(f"[AUTH ERROR] User {self.user_id} attempted to message group {message.target_id} without membership")
                        return

                message.received_at = int(time.time() * 1000)

                try:
                    await self.message_handler.handle(message)
                except Exception as e:
                    print(f"[HANDLER ERROR] {e}")

                # Save message to database for history
                await self.save_message_to_db(message)

                if self.has_protobuf():
                    if isinstance(wrapper, DictObjectWrapper):
                        # Ensure we convert back to protobuf bytes
                        pb_wrap = messages_pb2.ProtocolWrapper()
                        pb_wrap.chat_message.message_id = message.message_id
                        pb_wrap.chat_message.sender_id = message.sender_id
                        pb_wrap.chat_message.target_id = message.target_id
                        pb_wrap.chat_message.is_group_message = message.is_group_message
                        # Use exact bytes payload
                        payload_val = message.payload
                        if isinstance(payload_val, str):
                            pb_wrap.chat_message.payload = payload_val.encode('utf-8')
                        elif isinstance(payload_val, bytes):
                            pb_wrap.chat_message.payload = payload_val
                        pb_wrap.chat_message.type = message.type
                        pb_wrap.chat_message.received_at = message.received_at
                        if message.reply_to_message_id:
                            pb_wrap.chat_message.reply_to_message_id = message.reply_to_message_id
                        if message.timer_seconds:
                            pb_wrap.chat_message.timer_seconds = message.timer_seconds
                        if message.HasField('attachment'):
                            pb_wrap.chat_message.attachment.id = message.attachment.id
                            pb_wrap.chat_message.attachment.name = message.attachment.name
                            pb_wrap.chat_message.attachment.url = message.attachment.url
                            pb_wrap.chat_message.attachment.type = message.attachment.type
                            pb_wrap.chat_message.attachment.size = message.attachment.size
                        updated_bytes = pb_wrap.SerializeToString()
                    else:
                        updated_bytes = wrapper.SerializeToString()
                    encoded = base64.b64encode(updated_bytes).decode('ascii')
                    is_protobuf = True
                else:
                    encoded = json.dumps(wrapper._data)
                    is_protobuf = False

                if is_emergency:
                    # Broadcast to all connected users
                    await self.channel_layer.group_send(
                        'all_users',
                        {'type': 'chat.message', 'data': encoded, 'is_protobuf': is_protobuf}
                    )
                elif message.is_group_message:
                    target_group = f'group_{message.target_id}'
                    await self.channel_layer.group_send(
                        target_group,
                        {'type': 'chat.message', 'data': encoded, 'is_protobuf': is_protobuf}
                    )
                else:
                    target_group = f'user_{message.target_id}'
                    await self.channel_layer.group_send(
                        target_group,
                        {'type': 'chat.message', 'data': encoded, 'is_protobuf': is_protobuf}
                    )
                    await self.channel_layer.group_send(
                        self.personal_group,
                        {'type': 'chat.message', 'data': encoded, 'is_protobuf': is_protobuf}
                    )
                    # Auto-create unverified bookmark for recipient
                    await self.create_unverified_bookmark(
                        sender_username=message.sender_id,
                        recipient_username=message.target_id
                    )

                    # Intercept AI Assistant messages
                    if message.target_id == 'AI_Assistant':
                        modules = self.license_info.get('MODULES', '') if self.license_info else ''
                        if 'GENERAL_AI' in modules or 'ADVANCE_AI' in modules:
                            import asyncio
                            use_advance_ai = 'ADVANCE_AI' in modules
                            asyncio.create_task(self.handle_ai_assistant_response(message, use_advance_ai))


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

            elif wrapper.HasField('receipt'):
                # Check license for Read Receipt feature
                modules = self.license_info.get('MODULES', '') if self.license_info else ''
                if 'READ_RECEIPT' not in modules:
                    return

                receipt = wrapper.receipt
                status_changed, new_status, sender_username = await self.update_message_receipt_in_db(receipt)

                if status_changed:
                    if receipt.is_group:
                        if self.has_protobuf():
                            new_wrapper = messages_pb2.ProtocolWrapper()
                            new_wrapper.receipt.message_id = receipt.message_id
                            new_wrapper.receipt.chat_id = receipt.chat_id
                            new_wrapper.receipt.reader_id = receipt.reader_id
                            new_wrapper.receipt.type = 0 if new_status == 1 else 1
                            new_wrapper.receipt.is_group = receipt.is_group
                            encoded = base64.b64encode(new_wrapper.SerializeToString()).decode('ascii')
                            is_protobuf = True
                        else:
                            wrapper_data = {
                                'receipt': {
                                    'messageId': receipt.message_id,
                                    'chatId': receipt.chat_id,
                                    'readerId': receipt.reader_id,
                                    'type': 0 if new_status == 1 else 1,
                                    'isGroup': receipt.is_group
                                }
                            }
                            encoded = json.dumps(wrapper_data)
                            is_protobuf = False

                        await self.channel_layer.group_send(
                            f'user_{sender_username}',
                            {
                                'type': 'chat.message',
                                'data': encoded,
                                'is_protobuf': is_protobuf
                            }
                        )
                    else:
                        if self.has_protobuf():
                            if isinstance(wrapper, DictObjectWrapper):
                                pb_wrap = messages_pb2.ProtocolWrapper()
                                pb_wrap.receipt.message_id = receipt.message_id
                                pb_wrap.receipt.chat_id = receipt.chat_id
                                pb_wrap.receipt.reader_id = receipt.reader_id
                                pb_wrap.receipt.type = receipt.type
                                pb_wrap.receipt.is_group = receipt.is_group
                                encoded = base64.b64encode(pb_wrap.SerializeToString()).decode('ascii')
                            else:
                                encoded = base64.b64encode(wrapper.SerializeToString()).decode('ascii')
                            is_protobuf = True
                        else:
                            encoded = json.dumps(wrapper._data)
                            is_protobuf = False

                        target_group = f'user_{receipt.chat_id}'
                        await self.channel_layer.group_send(
                            target_group,
                            {
                                'type': 'chat.message',
                                'data': encoded,
                                'is_protobuf': is_protobuf
                            }
                        )

            elif wrapper.HasField('presence'):
                if self.has_protobuf():
                    if isinstance(wrapper, DictObjectWrapper):
                        pb_wrap = messages_pb2.ProtocolWrapper()
                        pb_wrap.presence.user_id = wrapper.presence.user_id
                        pb_wrap.presence.status = wrapper.presence.status
                        pb_wrap.presence.is_online = wrapper.presence.is_online
                        encoded = base64.b64encode(pb_wrap.SerializeToString()).decode('ascii')
                    else:
                        encoded = base64.b64encode(wrapper.SerializeToString()).decode('ascii')
                    is_protobuf = True
                else:
                    encoded = json.dumps(wrapper._data)
                    is_protobuf = False

                # Broadcast to all users who have bookmarked this user
                contact_ids = await self.get_contact_user_ids(self.user_id)
                for uid in contact_ids:
                    await self.channel_layer.group_send(
                        f'user_{uid}',
                        {
                            'type': 'chat.message',
                            'data': encoded,
                            'is_protobuf': is_protobuf
                        }
                    )

            elif wrapper.HasField('webrtc_signal'):
                # Check license for VIDEOCALL feature
                modules = self.license_info.get('MODULES', '') if self.license_info else ''
                if 'VIDEOCALL' not in modules:
                    print(f"[LICENSE ERROR] User {self.user_id} attempted WebRTC signaling without VIDEOCALL license")
                    return

                webrtc_signal = wrapper.webrtc_signal
                
                # Prevent sender impersonation IDOR
                if webrtc_signal.sender_id != self.user_id:
                    print(f"[AUTH WARN] Enforcing webrtc_signal.sender_id to {self.user_id} (attempted {webrtc_signal.sender_id})")
                    webrtc_signal.sender_id = self.user_id

                # Route the signal to the target user's personal channel group
                target_group = f'user_{webrtc_signal.target_id}'
                
                if self.has_protobuf():
                    if isinstance(wrapper, DictObjectWrapper):
                        pb_wrap = messages_pb2.ProtocolWrapper()
                        pb_wrap.webrtc_signal.type = webrtc_signal.type
                        pb_wrap.webrtc_signal.sender_id = webrtc_signal.sender_id
                        pb_wrap.webrtc_signal.target_id = webrtc_signal.target_id
                        pb_wrap.webrtc_signal.sdp = webrtc_signal.sdp
                        pb_wrap.webrtc_signal.candidate = webrtc_signal.candidate
                        pb_wrap.webrtc_signal.call_id = webrtc_signal.call_id
                        pb_wrap.webrtc_signal.is_video = webrtc_signal.is_video
                        encoded = base64.b64encode(pb_wrap.SerializeToString()).decode('ascii')
                    else:
                        encoded = base64.b64encode(wrapper.SerializeToString()).decode('ascii')
                    is_protobuf = True
                else:
                    encoded = json.dumps(wrapper._data)
                    is_protobuf = False
                
                await self.channel_layer.group_send(
                    target_group,
                    {
                        'type': 'chat.message',
                        'data': encoded,
                        'is_protobuf': is_protobuf
                    }
                )

        except Exception as e:
            print(f"[RECEIVE PROCESS ERROR] {e}")
            import traceback
            traceback.print_exc()

    # --- Channel layer handlers ---

    async def chat_message(self, event):
        """Deliver a chat message to the client (Protobuf or JSON)."""
        is_protobuf = event.get('is_protobuf', True)
        if is_protobuf:
            raw_bytes = base64.b64decode(event['data'])
            await self.send(bytes_data=raw_bytes)
        else:
            await self.send(text_data=event['data'])

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

    @database_sync_to_async
    def get_user_role(self, username):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        try:
            return User.objects.get(username=username).role
        except User.DoesNotExist:
            return "User"

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

    async def handle_ai_assistant_response(self, message, use_advance_ai=False):
        """
        Process the user's message to AI_Assistant asynchronously in the background.
        Provides failure isolation (wrapped in a global try-except block).
        """
        try:
            from django.contrib.auth import get_user_model
            from aichat.services import process_ai_query
            from chat.models import MessageAttachment
            from channels.db import database_sync_to_async
            import uuid
            import time
            import json
            
            User = get_user_model()
            
            # Fetch sender User object from DB
            sender_user = await database_sync_to_async(User.objects.get)(username=message.sender_id)
            
            # Fetch attachment ID if present
            attachment_id = None
            if message.HasField('attachment'):
                try:
                    attachment = await database_sync_to_async(
                        lambda: MessageAttachment.objects.filter(message__message_id=message.message_id).first()
                    )()
                    if attachment:
                        attachment_id = attachment.id
                except Exception:
                    pass

            # Mark the user's message as READ by AI Assistant immediately
            from chat.models import Message as DBMessage
            await database_sync_to_async(DBMessage.objects.filter(message_id=message.message_id).update)(read_receipt=2)
            
            # Send READ receipt back to the user via WebSocket
            if self.has_protobuf():
                from chat.protocols import messages_pb2
                import base64
                rec_wrap = messages_pb2.ProtocolWrapper()
                rec_wrap.receipt.message_id = message.message_id
                rec_wrap.receipt.chat_id = 'AI_Assistant'
                rec_wrap.receipt.reader_id = 'AI_Assistant'
                rec_wrap.receipt.type = 1  # 1 means READ
                rec_wrap.receipt.is_group = False
                encoded_rec = base64.b64encode(rec_wrap.SerializeToString()).decode('ascii')
                is_rec_protobuf = True
            else:
                wrapper_data = {
                    'receipt': {
                        'messageId': message.message_id,
                        'chatId': 'AI_Assistant',
                        'readerId': 'AI_Assistant',
                        'type': 1,
                        'isGroup': False
                    }
                }
                encoded_rec = json.dumps(wrapper_data)
                is_rec_protobuf = False
            
            await self.channel_layer.group_send(
                f'user_{message.sender_id}',
                {
                    'type': 'chat.message',
                    'data': encoded_rec,
                    'is_protobuf': is_rec_protobuf
                }
            )

            # Decrypt query, search docs, run heuristic QA engine, and encrypt reply
            # Wrap in database_sync_to_async since process_ai_query performs blocking file and DB reads
            payload_str = message.payload.decode('utf-8', errors='replace')
            
            res = await database_sync_to_async(process_ai_query)(
                user=sender_user,
                encrypted_query_or_plain=payload_str,
                attachment_id=attachment_id,
                use_advance_ai=use_advance_ai
            )
            
            reply_text = res['reply_text']
            reply_payload = res['encrypted_reply']
            is_e2ee = res['is_e2ee']
            
            # Create a DictObjectWrapper or mock protobuf message for the reply
            ai_msg_id = str(uuid.uuid4())
            curr_time = int(time.time() * 1000)
            
            # Create ProtocolWrapper or DictObjectWrapper based on self.has_protobuf()
            if self.has_protobuf():
                from chat.protocols import messages_pb2
                import base64
                
                pb_wrap = messages_pb2.ProtocolWrapper()
                pb_wrap.chat_message.message_id = ai_msg_id
                pb_wrap.chat_message.sender_id = 'AI_Assistant'
                pb_wrap.chat_message.target_id = self.user_id
                pb_wrap.chat_message.is_group_message = False
                pb_wrap.chat_message.payload = reply_payload.encode('utf-8')
                pb_wrap.chat_message.type = 0  # TEXT
                pb_wrap.chat_message.received_at = curr_time
                
                updated_bytes = pb_wrap.SerializeToString()
                encoded_msg = base64.b64encode(updated_bytes).decode('ascii')
                is_protobuf = True
            else:
                data = {
                    'chat_message': {
                        'message_id': ai_msg_id,
                        'sender_id': 'AI_Assistant',
                        'target_id': self.user_id,
                        'is_group_message': False,
                        'payload': reply_payload,
                        'type': 0,
                        'received_at': curr_time
                    }
                }
                encoded_msg = json.dumps(data)
                is_protobuf = False
                
            # Create a mock wrapper to pass to save_message_to_db
            class MockMessage:
                def __init__(self, msg_id, sender_id, target_id, payload_bytes, received_at):
                    self.message_id = msg_id
                    self.sender_id = sender_id
                    self.target_id = target_id
                    self.is_group_message = False
                    self.payload = payload_bytes
                    self.type = 0
                    self.received_at = received_at
                    self.reply_to_message_id = None
                    self.timer_seconds = 0
                def HasField(self, field):
                    return False
                    
            mock_msg = MockMessage(
                msg_id=ai_msg_id,
                sender_id='AI_Assistant',
                target_id=self.user_id,
                payload_bytes=reply_payload.encode('utf-8'),
                received_at=curr_time
            )
            
            # Save the AI's reply to the database (for persistent DM history)
            await self.save_message_to_db(mock_msg)
            
            # Send the message to the user's connection group
            target_group = f'user_{self.user_id}'
            await self.channel_layer.group_send(
                target_group,
                {
                    'type': 'chat.message',
                    'data': encoded_msg,
                    'is_protobuf': is_protobuf
                }
            )
        except Exception as e:
            # Failure Isolation: Make sure errors in the AI background task never crash WebSockets
            print(f"[AI PROCESSING ERROR] {e}")

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
            if message.sender_id == 'AI_Assistant':
                try:
                    User.objects.get(username='AI_Assistant')
                except User.DoesNotExist:
                    from aichat.services import init_ai_assistant
                    init_ai_assistant()
            sender = User.objects.get(username=message.sender_id)
            content = message.payload.decode('utf-8', errors='replace')
            
            # Module 1: Self-Destruct Timers
            expires_at = None
            if hasattr(message, 'timer_seconds') and message.timer_seconds > 0:
                expires_at = timezone.now() + datetime.timedelta(seconds=message.timer_seconds)
            else:
                expires_at = timezone.now() + datetime.timedelta(seconds=settings.GLOBAL_MESSAGE_EXPIRATION_SECONDS)

            if message.target_id == "EMERGENCY":
                # Emergency broadcast — store without group or recipient
                db_message, created = DBMessage.objects.get_or_create(
                    message_id=message.message_id,
                    defaults={
                        'sender': sender,
                        'content': content,
                        'message_type': message.type,
                        'is_emergency_broadcast': True,
                        'expires_at': expires_at,
                        'reply_to_message_id': message.reply_to_message_id if message.reply_to_message_id else None,
                    }
                )
                if message.HasField('attachment'):
                    MessageAttachment.objects.get_or_create(
                        message=db_message,
                        defaults={
                            'file_name': message.attachment.name,
                            'file': message.attachment.url.replace(settings.MEDIA_URL, ''),
                            'file_type': message.attachment.type,
                            'file_size': message.attachment.size,
                            'expires_at': expires_at,
                        }
                    )
            elif message.is_group_message:
                try:
                    group = ChatGroup.objects.get(id=int(message.target_id))
                    db_message, created = DBMessage.objects.get_or_create(
                        message_id=message.message_id,
                        defaults={
                            'sender': sender,
                            'group': group,
                            'content': content,
                            'message_type': message.type,
                            'expires_at': expires_at,
                            'reply_to_message_id': message.reply_to_message_id if message.reply_to_message_id else None,
                        }
                    )
                    # Handle attachment
                    if message.HasField('attachment'):
                        MessageAttachment.objects.get_or_create(
                            message=db_message,
                            defaults={
                                'file_name': message.attachment.name,
                                'file': message.attachment.url.replace(settings.MEDIA_URL, ''),
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
                            'message_type': message.type,
                            'expires_at': expires_at,
                            'reply_to_message_id': message.reply_to_message_id if message.reply_to_message_id else None,
                        }
                    )
                    # Handle attachment
                    if message.HasField('attachment'):
                        MessageAttachment.objects.get_or_create(
                            message=db_message,
                            defaults={
                                'file_name': message.attachment.name,
                                'file': message.attachment.url.replace(settings.MEDIA_URL, ''),
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

    @database_sync_to_async
    def update_message_receipt_in_db(self, receipt):
        """Update the read_receipt status of a message in the database."""
        from .models import Message as DBMessage, ChatGroup
        try:
            # ReceiptType: DELIVERED=0, READ=1
            # Model read_receipt: 1: Delivered, 2: Read
            new_status = 1 if receipt.type == 0 else 2
            
            msg = DBMessage.objects.filter(message_id=receipt.message_id).first()
            if not msg:
                return False, None, None

            if not receipt.is_group:
                # Simple DM update: only upgrade status
                if msg.read_receipt < new_status:
                    msg.read_receipt = new_status
                    msg.save(update_fields=['read_receipt'])
                    return True, new_status, msg.sender.username
                return False, None, None
            else:
                # Group Chat update: track individual member status
                group_receipts = dict(msg.group_receipts) if msg.group_receipts else {}
                current_user_status = group_receipts.get(receipt.reader_id, 0)
                
                if current_user_status >= new_status:
                    return False, None, None
                    
                group_receipts[receipt.reader_id] = new_status
                msg.group_receipts = group_receipts
                msg.save(update_fields=['group_receipts'])
                
                try:
                    group = ChatGroup.objects.get(id=int(receipt.chat_id))
                    # Check threshold among all members except sender
                    members = group.members.exclude(id=msg.sender.id)
                    member_count = members.count()
                    
                    if member_count == 0:
                        return False, None, None
                        
                    min_status = 2
                    members_with_receipts = 0
                    
                    for m in members:
                        ms = group_receipts.get(m.username, 0)
                        if ms < min_status:
                            min_status = ms
                        if ms > 0:
                            members_with_receipts += 1
                            
                    if members_with_receipts < member_count:
                        min_status = 0
                        
                    if min_status > msg.read_receipt:
                        msg.read_receipt = min_status
                        msg.save(update_fields=['read_receipt'])
                        return True, min_status, msg.sender.username
                except (ChatGroup.DoesNotExist, ValueError):
                    pass
                    
                return False, None, None
        except Exception as e:
            print(f"[DB RECEIPT ERROR] {e}")
            return False, None, None
