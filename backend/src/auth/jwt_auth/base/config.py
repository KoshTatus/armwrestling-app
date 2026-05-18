from datetime import timedelta
from dataclasses import dataclass
from src.settings import settings

@dataclass
class JWTConfig:
    secret: str = settings.secret_key
    algorithm: str = settings.algorithm
    access_token_ttl: timedelta = timedelta(seconds=settings.access_token_expire_seconds)