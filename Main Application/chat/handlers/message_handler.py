from abc import ABC, abstractmethod
from ..protocols import messages_pb2

class MessageStrategy(ABC):
    @abstractmethod
    async def process(self, message: messages_pb2.ChatMessage):
        pass

class TextMessageStrategy(MessageStrategy):
    async def process(self, message: messages_pb2.ChatMessage):
        # Handle text message logic (e.g., logging, validation)
        print(f"Processing TEXT message: {message.message_id}")
        return message

class PTTMessageStrategy(MessageStrategy):
    async def process(self, message: messages_pb2.ChatMessage):
        # Handle PTT audio burst (e.g., buffering, priority checks)
        print(f"Processing PTT message: {message.message_id}")
        # Audio is binary in payload
        return message

class BroadcastAlertStrategy(MessageStrategy):
    async def process(self, message: messages_pb2.ChatMessage):
        # Handle high-priority broadcast alerts
        print(f"Processing BROADCAST ALERT: {message.message_id}")
        message.is_high_priority = True
        return message

class SystemMessageStrategy(MessageStrategy):
    async def process(self, message: messages_pb2.ChatMessage):
        # System messages (joins, leaves, etc.)
        print(f"Processing SYSTEM message: {message.message_id}")
        return message

class MessageHandler:
    def __init__(self):
        self._strategies = {
            messages_pb2.ChatMessage.MessageType.TEXT: TextMessageStrategy(),
            messages_pb2.ChatMessage.MessageType.PTT: PTTMessageStrategy(),
            messages_pb2.ChatMessage.MessageType.BROADCAST_ALERT: BroadcastAlertStrategy(),
            4: SystemMessageStrategy(),
        }

    async def handle(self, message: messages_pb2.ChatMessage):
        strategy = self._strategies.get(message.type)
        if strategy:
            return await strategy.process(message)
        return message

    def broadcast_group_message(self, group_id, sender_id, content, message_id, msg_type=0):
        """Sync helper to broadcast a message to a group via channel layer."""
        import base64
        import time
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        
        pb_msg = messages_pb2.ChatMessage()
        pb_msg.message_id = message_id
        pb_msg.sender_id = sender_id
        pb_msg.target_id = str(group_id)
        pb_msg.type = msg_type
        pb_msg.payload = content.encode('utf-8')
        pb_msg.sent_at = int(time.time() * 1000)
        pb_msg.is_group_message = True
        
        wrapper = messages_pb2.ProtocolWrapper()
        wrapper.chat_message.CopyFrom(pb_msg)
        
        raw_bytes = wrapper.SerializeToString()
        b64_data = base64.b64encode(raw_bytes).decode('utf-8')
        
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'group_{group_id}',
            {
                'type': 'chat.message',
                'data': b64_data
            }
        )
