from pydantic_settings import BaseSettings
from functools import lru_cache
import os


def _default_db() -> str:
    # Railway injects DATABASE_URL as postgres:// — convert to asyncpg
    url = os.environ.get("DATABASE_URL", "")
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return "sqlite+aiosqlite:///./bot26.db"


class Settings(BaseSettings):
    database_url: str = _default_db()
    jwt_secret: str = "change-this-in-production"
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24
    fernet_key: str = ""
    metaapi_token: str = ""

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
