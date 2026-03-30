from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import json


class WebSocketManager:
    def __init__(self):
        self._connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket):
        await ws.accept()
        self._connections.setdefault(user_id, []).append(ws)

    def disconnect(self, user_id: str, ws: WebSocket):
        if user_id in self._connections:
            self._connections[user_id] = [c for c in self._connections[user_id] if c != ws]

    async def broadcast(self, user_id: str, data: dict):
        dead = []
        for ws in self._connections.get(user_id, []):
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(user_id, ws)


manager = WebSocketManager()
