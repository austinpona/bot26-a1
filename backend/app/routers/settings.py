from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from app.database import get_db
from app.models.bot_settings import BotSettings
from app.models.user import User
from app.schemas.settings import SettingsResponse, UpdateSettingsRequest
from app.dependencies import get_current_user

router = APIRouter(prefix="/settings", tags=["settings"])


async def _get_or_create(db: AsyncSession, user_id: str) -> BotSettings:
    result = await db.execute(select(BotSettings).where(BotSettings.user_id == user_id))
    s = result.scalar_one_or_none()
    if not s:
        s = BotSettings(user_id=user_id)
        db.add(s)
        await db.commit()
        await db.refresh(s)
    return s


@router.get("", response_model=SettingsResponse)
async def get_settings(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    s = await _get_or_create(db, user.id)
    return SettingsResponse(
        strategy_name=s.strategy_name,
        stop_loss=s.stop_loss,
        take_profit=s.take_profit,
        two_factor_enabled=user.two_factor_enabled,
    )


@router.post("", response_model=SettingsResponse)
async def update_settings(
    body: UpdateSettingsRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    await _get_or_create(db, user.id)
    await db.execute(
        update(BotSettings)
        .where(BotSettings.user_id == user.id)
        .values(
            strategy_name=body.strategy_name,
            stop_loss=body.stop_loss,
            take_profit=body.take_profit,
        )
    )
    await db.commit()
    s = await _get_or_create(db, user.id)
    return SettingsResponse(
        strategy_name=s.strategy_name,
        stop_loss=s.stop_loss,
        take_profit=s.take_profit,
        two_factor_enabled=user.two_factor_enabled,
    )
