from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.trade_log import TradeLog
from app.models.user import User
from app.schemas.bot import LogEntry
from app.dependencies import get_current_user
from typing import List

router = APIRouter(prefix="/logs", tags=["logs"])


@router.get("", response_model=List[LogEntry])
async def get_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    offset = (page - 1) * limit
    result = await db.execute(
        select(TradeLog)
        .where(TradeLog.user_id == user.id)
        .order_by(TradeLog.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    logs = result.scalars().all()
    return [
        LogEntry(
            id=log.id,
            symbol=log.symbol,
            action=log.action,
            entry_price=log.entry_price,
            stop_loss=log.stop_loss,
            take_profit=log.take_profit,
            status=log.status,
            log_message=log.log_message,
            created_at=log.created_at.isoformat(),
        )
        for log in logs
    ]
