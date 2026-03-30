from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routers import auth, account, bot, license, logs, settings
from app.websocket import manager
from app.utils.security import decode_jwt
import app.services.trading_engine as trading_engine

app = FastAPI(title="Bot 26 A1", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Wire websocket manager into trading engine
trading_engine.ws_manager = manager

app.include_router(auth.router)
app.include_router(account.router)
app.include_router(bot.router)
app.include_router(license.router)
app.include_router(logs.router)
app.include_router(settings.router)


@app.on_event("startup")
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.websocket("/logs/live")
async def websocket_logs(websocket: WebSocket, token: str = ""):
    user_id = decode_jwt(token) if token else None
    if not user_id:
        await websocket.close(code=4001)
        return
    await manager.connect(user_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # keep alive
    except WebSocketDisconnect:
        manager.disconnect(user_id, websocket)
