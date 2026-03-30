from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from app.database import get_db
from app.models.linked_account import LinkedAccount
from app.models.user import User
from app.schemas.account import LinkAccountRequest, AccountStatusResponse
from app.utils.security import encrypt_credential
from app.dependencies import get_current_user

router = APIRouter(prefix="/account", tags=["account"])


@router.post("/link", response_model=AccountStatusResponse)
async def link_account(
    body: LinkAccountRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Remove any existing linked account
    await db.execute(delete(LinkedAccount).where(LinkedAccount.user_id == user.id))
    account = LinkedAccount(
        user_id=user.id,
        broker=body.broker,
        server=body.server,
        account_number=body.account_number,
        password_encrypted=encrypt_credential(body.password),
    )
    db.add(account)
    await db.commit()
    return AccountStatusResponse(
        linked=True,
        broker=account.broker,
        server=account.server,
        account_number=account.account_number,
    )


@router.get("/status", response_model=AccountStatusResponse)
async def account_status(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(select(LinkedAccount).where(LinkedAccount.user_id == user.id))
    account = result.scalar_one_or_none()
    if not account:
        return AccountStatusResponse(linked=False)
    return AccountStatusResponse(
        linked=True,
        broker=account.broker,
        server=account.server,
        account_number=account.account_number,
    )
