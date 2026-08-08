import json
from channels.generic.websocket import AsyncWebsocketConsumer

class NotificationConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]

        if self.user.is_anonymous:
            await self.close()
        else:
            # Join a personal group for the user
            self.user_group_name = f"user_{self.user.id}"
            await self.channel_layer.group_add(
                self.user_group_name,
                self.channel_name
            )
            await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'user_group_name'):
            await self.channel_layer.group_discard(
                self.user_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        # We don't really expect the client to send messages,
        # but if they do, we can handle them here.
        pass

    async def send_notification(self, event):
        """
        Send a notification event to the WebSocket.
        Expected event format: {"type": "send_notification", "message": {...}}
        """
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': message
        }))
