from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", extra="ignore")

    app_env: str = "development"
    secret_key: str = "change-me"

    # Telegram
    telegram_bot_token: str = ""
    webhook_base_url: str = ""

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""

    # Auth
    supabase_jwt_secret: str = ""

    # OpenAI
    openai_api_key: str = ""

    # Cloudflare R2
    cloudflare_account_id: str = ""
    r2_access_key_id: str = ""
    r2_secret_access_key: str = ""
    r2_bucket_name: str = "dokonly-media"
    r2_public_url: str = ""

    # Database
    database_url: str = ""

    # Redis
    redis_url: str = "redis://localhost:6379"

    @property
    def is_production(self) -> bool:
        return self.app_env == "production"


settings = Settings()
