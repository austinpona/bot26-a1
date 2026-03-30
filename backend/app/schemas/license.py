from pydantic import BaseModel
from typing import Optional


class ValidateLicenseRequest(BaseModel):
    license_key: str


class LicenseStatusResponse(BaseModel):
    active: bool
    status: Optional[str] = None
    expires_at: Optional[str] = None
    license_key_masked: Optional[str] = None
