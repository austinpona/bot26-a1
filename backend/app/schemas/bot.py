from pydantic import BaseModel
from typing import Optional


class BotStatusResponse(BaseModel):
    is_active: bool
    balance: float
    equity: float
    open_trades_count: int
    strategy: str


class LogEntry(BaseModel):
    id: str
    symbol: str
    action: str
    entry_price: float
    stop_loss: float
    take_profit: float
    status: str
    log_message: str
    created_at: str
