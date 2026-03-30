from pydantic import BaseModel


class SettingsResponse(BaseModel):
    strategy_name: str
    stop_loss: int
    take_profit: int
    two_factor_enabled: bool


class UpdateSettingsRequest(BaseModel):
    strategy_name: str
    stop_loss: int
    take_profit: int
