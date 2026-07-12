import json
from urllib.parse import parse_qs
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

@database_sync_to_async
def get_user_from_token(token):
    from core.models import User
    try:
        access_token = AccessToken(token)
        user = User.objects.get(id=access_token['user_id'])
        return user
    except (TokenError, InvalidToken, User.DoesNotExist):
        return None

@database_sync_to_async
def is_board_member(user, board_id):
    from core.models import Board
    try:
        board = Board.objects.get(id=board_id, is_active=True)
        return board.owner == user or board.members.filter(id=user.id).exists()
    except Board.DoesNotExist:
        return False

class BoardConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.board_id = self.scope['url_route']['kwargs']['board_id']
        self.group_name = f"board_{self.board_id}"
        
        query_string = self.scope['query_string'].decode()
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]
        
        if not token:
            await self.close(code=4001)
            return
            
        user = await get_user_from_token(token)
        if not user:
            await self.close(code=4001)
            return
            
        if not await is_board_member(user, self.board_id):
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    async def board_update(self, event):
        message_payload = event.get('payload', {})
        event_type = event.get('event_type', 'unknown')
        sender_socket_id = event.get('sender_socket_id', None)
        
        await self.send(text_data=json.dumps({
            'type': event_type,
            'payload': message_payload,
            'sender_socket_id': sender_socket_id
        }))
