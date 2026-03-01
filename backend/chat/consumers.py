import json
from channels.generic.websocket import AsyncWebsocketConsumer
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

        # Join personal user channel for 1-to-1 DMs and targeted alerts
        await self.channel_layer.group_add(
            self.personal_group,
            self.channel_name
        )
        self.joined_groups.add(self.personal_group)

        await self.accept()

    async def disconnect(self, close_code):
        for group in self.joined_groups:
            await self.channel_layer.group_discard(
                group,
                self.channel_name
            )

    async def receive(self, text_data=None, bytes_data=None):
        if bytes_data:
            wrapper = messages_pb2.ProtocolWrapper()
            try:
                wrapper.ParseFromString(bytes_data)
                
                if wrapper.HasField('chat_message'):
                    message = wrapper.chat_message
                    message.received_at = int(time.time() * 1000)
                    
                    # Process message through strategy handler
                    processed_message = await self.message_handler.handle(message)
                    
                    if message.is_group_message:
                        target_group = f'group_{message.target_id}'
                    else:
                        target_group = f'user_{message.target_id}'

                    await self.channel_layer.group_send(
                        target_group,
                        {
                            'type': 'chat_message',
                            'message_bytes': wrapper.SerializeToString()
                        }
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
                        
            except Exception as e:
                print(f"Error parsing Protobuf: {e}")

    async def chat_message(self, event):
        await self.send(bytes_data=event['message_bytes'])
