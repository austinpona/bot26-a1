import asyncio
from typing import Dict
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import AsyncSessionLocal
from app.models.bot_settings import BotSettings
from app.models.linked_account import LinkedAccount
from app.models.trade_log import TradeLog, TradeAction, TradeStatus
from app.services.broker_connector import SimulatedConnector, MetaApiConnector, BrokerConnector
from app.utils.indicators import calculate_rsi, calculate_sma
from app.utils import security

SYMBOLS = ["EURUSD", "GBPUSD", "USDJPY", "XAUUSD"]

# Per-user running tasks and connectors
_tasks: Dict[str, asyncio.Task] = {}
_connectors: Dict[str, BrokerConnector] = {}

# WebSocket manager reference (set by websocket.py)
ws_manager = None


async def _log_trade(db: AsyncSession, user_id: str, trade: dict, message: str, status: str = "OPEN"):
    entry = TradeLog(
        user_id=user_id,
        symbol=trade["symbol"],
        action=trade["action"],
        entry_price=trade["entry_price"],
        stop_loss=trade.get("sl_price", 0.0),
        take_profit=trade.get("tp_price", 0.0),
        status=status,
        log_message=message,
    )
    db.add(entry)
    await db.commit()
    if ws_manager:
        await ws_manager.broadcast(user_id, {"message": message, "timestamp": datetime.utcnow().isoformat()})


async def _get_settings(db: AsyncSession, user_id: str) -> BotSettings | None:
    result = await db.execute(select(BotSettings).where(BotSettings.user_id == user_id))
    return result.scalar_one_or_none()


async def _get_connector(user_id: str, db: AsyncSession) -> BrokerConnector:
    if user_id in _connectors:
        return _connectors[user_id]
    result = await db.execute(select(LinkedAccount).where(LinkedAccount.user_id == user_id))
    account = result.scalar_one_or_none()
    from app.config import get_settings
    metaapi_token = get_settings().metaapi_token or __import__("os").environ.get("METAAPI_TOKEN", "")
    if account and metaapi_token:
        connector: BrokerConnector = MetaApiConnector()
        try:
            pwd = security.decrypt_credential(account.password_encrypted)
            connected = await connector.connect(account.server, account.account_number, pwd)
            if not connected:
                connector = SimulatedConnector()
                await connector.connect("", "", "")
        except Exception:
            connector = SimulatedConnector()
    else:
        connector = SimulatedConnector()
    _connectors[user_id] = connector
    return connector


async def _engine_loop(user_id: str):
    while True:
        async with AsyncSessionLocal() as db:
            settings = await _get_settings(db, user_id)
            if not settings or not settings.is_active:
                break

            connector = await _get_connector(user_id, db)

            # Notify scanning
            if ws_manager:
                await ws_manager.broadcast(user_id, {
                    "message": f"Scanning markets...",
                    "timestamp": datetime.utcnow().isoformat(),
                })

            for symbol in SYMBOLS:
                try:
                    candles = await connector.get_candles(symbol, "M5", 100)
                    rsi = calculate_rsi(candles, 14)
                    sma_fast = calculate_sma(candles, 10)
                    sma_slow = calculate_sma(candles, 50)

                    signal = None
                    if settings.strategy_name == "Scalping RSI":
                        if rsi < 30 and sma_fast > sma_slow:
                            signal = "BUY"
                        elif rsi > 70 and sma_fast < sma_slow:
                            signal = "SELL"

                    if ws_manager:
                        await ws_manager.broadcast(user_id, {
                            "message": f"Scanning {symbol} — RSI: {rsi:.1f}",
                            "timestamp": datetime.utcnow().isoformat(),
                        })

                    if signal:
                        trade = await connector.place_order(
                            symbol=symbol,
                            action=signal,
                            lot_size=0.01,
                            sl=settings.stop_loss,
                            tp=settings.take_profit,
                        )
                        msg = f"{signal} Order Placed — {symbol} @ {trade['entry_price']:.5f}"
                        await _log_trade(db, user_id, trade, msg, "OPEN")

                except Exception as e:
                    if ws_manager:
                        await ws_manager.broadcast(user_id, {
                            "message": f"Error on {symbol}: {str(e)}",
                            "timestamp": datetime.utcnow().isoformat(),
                        })

            # Check SL/TP on simulated connector
            if hasattr(connector, "check_sl_tp"):
                closed = await connector.check_sl_tp()
                for p in closed:
                    status = p["status"]
                    msg = f"{status.replace('_', ' ')} — {p['symbol']} P&L: {p['pnl']:+.2f}"
                    await _log_trade(db, user_id, p, msg, status)

        await asyncio.sleep(10)


async def start_engine(user_id: str):
    if user_id in _tasks and not _tasks[user_id].done():
        return
    task = asyncio.create_task(_engine_loop(user_id))
    _tasks[user_id] = task


async def stop_engine(user_id: str):
    async with AsyncSessionLocal() as db:
        await db.execute(
            update(BotSettings).where(BotSettings.user_id == user_id).values(is_active=False)
        )
        await db.commit()
    if user_id in _tasks:
        _tasks[user_id].cancel()
        del _tasks[user_id]
    if user_id in _connectors:
        del _connectors[user_id]
