from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime
from app.database import get_db
from app.models.license import License, LicenseStatus
from app.models.user import User
from app.schemas.license import ValidateLicenseRequest, LicenseStatusResponse
from app.services.license_service import parse_license
from app.dependencies import get_current_user

router = APIRouter(prefix="/license", tags=["license"])


@router.post("/validate", response_model=LicenseStatusResponse)
async def validate_license(
    body: ValidateLicenseRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = parse_license(body.license_key)
    if not result["valid"]:
        raise HTTPException(status_code=400, detail=result.get("reason", "Invalid key"))

    await db.execute(
        __import__("sqlalchemy", fromlist=["delete"]).delete(License).where(License.user_id == user.id)
    )
    lic = License(
        user_id=user.id,
        license_key=body.license_key.strip().upper(),
        status=LicenseStatus.ACTIVE,
        expires_at=result["expires_at"],
    )
    db.add(lic)
    await db.commit()
    key = lic.license_key
    masked = key[:4] + "****" + key[-4:] if len(key) >= 8 else "****"
    return LicenseStatusResponse(
        active=True,
        status="ACTIVE",
        expires_at=lic.expires_at.isoformat(),
        license_key_masked=masked,
    )


@router.get("/status", response_model=LicenseStatusResponse)
async def license_status(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(License).where(License.user_id == user.id).order_by(License.created_at.desc())
    )
    lic = result.scalar_one_or_none()
    if not lic:
        return LicenseStatusResponse(active=False)
    now = datetime.utcnow()
    is_active = lic.status == LicenseStatus.ACTIVE and lic.expires_at > now
    key = lic.license_key
    masked = key[:4] + "****" + key[-4:] if len(key) >= 8 else "****"
    return LicenseStatusResponse(
        active=is_active,
        status=lic.status,
        expires_at=lic.expires_at.isoformat(),
        license_key_masked=masked,
    )
