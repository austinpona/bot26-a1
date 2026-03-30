from pydantic import BaseModel
from typing import Optional


class LinkAccountRequest(BaseModel):
    broker: str
    server: str
    account_number: str
    password: str


class AccountStatusResponse(BaseModel):
    linked: bool
    broker: Optional[str] = None
    server: Optional[str] = None
    account_number: Optional[str] = None
