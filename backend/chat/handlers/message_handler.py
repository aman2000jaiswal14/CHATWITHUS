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

class MessageHandler:
    def __init__(self):
        self._strategies = {
            messages_pb2.ChatMessage.MessageType.TEXT: TextMessageStrategy(),
            messages_pb2.ChatMessage.MessageType.PTT: PTTMessageStrategy(),
            messages_pb2.ChatMessage.MessageType.BROADCAST_ALERT: BroadcastAlertStrategy(),
        }

    async def handle(self, message: messages_pb2.ChatMessage):
        strategy = self._strategies.get(message.type)
        if strategy:
            return await strategy.process(message)
        return message
