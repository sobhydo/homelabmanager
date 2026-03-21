from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./data/homelab.db"
    ANTHROPIC_API_KEY: str = ""
    UPLOAD_DIR: str = "./uploads"
    APP_NAME: str = "Homelab Manager"

    # Auth settings
    SECRET_KEY: str = "change-me-in-production-use-a-random-64-char-string"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    FIRST_ADMIN_USERNAME: str = "admin"
    FIRST_ADMIN_PASSWORD: str = "admin"

    model_config = SettingsConfigDict(env_file=".env")
