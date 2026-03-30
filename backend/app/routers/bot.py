from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models.bot_settings import BotSettings
from app.models.linked_account import LinkedAccount
from app.models.license import License, LicenseStatus
from app.models.user import User
from app.schemas.bot import BotStatusResponse
from app.services import trading_engine
from app.dependencies import get_current_user
from datetime import datetime

router = APIRouter(prefix="/bot", tags=["bot"])


async def _get_or_create_settings(db: AsyncSession, user_id: str) -> BotSettings:
    result = await db.execute(select(BotSettings).where(BotSettings.user_id == user_id))
    settings = result.scalar_one_or_none()
    if not settings:
        settings = BotSettings(user_id=user_id)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.post("/start")
async def start_bot(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Check broker linked
    acc_result = await db.execute(select(LinkedAccount).where(LinkedAccount.user_id == user.id))
    if not acc_result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="No broker linked")

    # Check valid license
    lic_result = await db.execute(
        select(License).where(License.user_id == user.id, License.status == LicenseStatus.ACTIVE)
    )
    lic = lic_result.scalar_one_or_none()
    if not lic or lic.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="No valid license")

    settings = await _get_or_create_settings(db, user.id)
    await db.execute(update(BotSettings).where(BotSettings.user_id == user.id).values(is_active=True))
    await db.commit()
    await trading_engine.start_engine(user.id)
    return {"detail": "Bot started"}


@router.post("/stop")
async def stop_bot(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await trading_engine.stop_engine(user.id)
    return {"detail": "Bot stopped"}


@router.get("/status", response_model=BotStatusResponse)
async def bot_status(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    settings = await _get_or_create_settings(db, user.id)
    connector = await trading_engine._get_connector(user.id, db)
    balance_data = await connector.get_balance()
    return BotStatusResponse(
        is_active=settings.is_active,
        balance=balance_data["balance"],
        equity=balance_data["equity"],
        open_trades_count=balance_data["open_trades"],
        strategy=settings.strategy_name,
    )
