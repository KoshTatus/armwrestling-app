from typing import Any
from datetime import datetime
import jwt
from src.auth.jwt_auth.base.config import JWTConfig


class JWTAuth:
    def __init__(self, config: JWTConfig):
        self.__config = config

    def generate_token(self, payload: dict[str, Any]) -> str:
        exp = datetime.utcnow() + self.__config.access_token_ttl
        payload.update(exp=exp)
        return jwt.encode(payload, self.__config.secret, algorithm=self.__config.algorithm)

    def verify_token(self, token) -> dict[str, Any]:
        return jwt.decode(token, self.__config.secret, algorithms=[self.__config.algorithm])