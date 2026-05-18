from pydantic_settings import BaseSettings
from pathlib import Path

class Settings(BaseSettings):
    model_config = {
        "env_file" : Path(__file__).parent / ".env",
        "env_file_encoding" : "utf-8"
    }

    secret_key: str
    algorithm: str
    access_token_expire_seconds: int
    db_user: str
    db_password: str
    db_host: str
    db_port: int
    db_name: str
    frontend_host: str
    frontend_port: int
    email_login: str
    email_password: str


settings = Settings()
