import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    # Server configuration
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    SECRET_KEY: str = "super-secret-key-for-jwt-signing-change-in-production"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/website_cloner"

    # Caching & Queue
    REDIS_URL: str = "redis://localhost:6379/0"

    # AI Layer
    OPENAI_API_KEY: str = ""

    # Integrations
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    GITHUB_REDIRECT_URI: str = "http://localhost:3000/api/auth/callback/github"

    # Deployments
    VERCEL_TOKEN: str = ""
    RENDER_TOKEN: str = ""
    NETLIFY_TOKEN: str = ""

    # Storage (Optional)
    CLOUDFLARE_R2_BUCKET: str = ""
    CLOUDFLARE_R2_ACCOUNT_ID: str = ""
    CLOUDFLARE_R2_ACCESS_KEY_ID: str = ""
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: str = ""

    # Local storage for cloned projects
    PROJECTS_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "../projects"))

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()

# Ensure projects directory exists
os.makedirs(settings.PROJECTS_DIR, exist_ok=True)
