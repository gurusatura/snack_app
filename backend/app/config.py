from functools import lru_cache
from pathlib import Path
from typing import List, Tuple
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
ROOT_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/snack_overflow"
    DIRECT_URL: str = "postgresql://postgres:postgres@localhost:5432/snack_overflow"

    # Security
    JWT_SECRET: str = "default_insecure_secret_for_scaffold_testing_only_32bytes"
    JWT_EXPIRE_MINUTES: int = 1440

    # CORS
    CORS_ORIGIN: str = "http://localhost:3000"

    # Seed credentials
    SEED_ADMIN_EMAIL: str = "admin@snackoverflow.local"
    SEED_ADMIN_PASSWORD: str = "AdminPassword123!"
    SEED_MEMBER1_EMAIL: str = "member1@snackoverflow.local"
    SEED_MEMBER1_PASSWORD: str = "Member1Password123!"
    SEED_MEMBER2_EMAIL: str = "member2@snackoverflow.local"
    SEED_MEMBER2_PASSWORD: str = "Member2Password123!"

    model_config = SettingsConfigDict(
        env_file=(str(BACKEND_DIR / ".env"), str(ROOT_DIR / ".env"), ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGIN.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
