from sqlalchemy import select
from sqlalchemy.orm import Session

from src.auth.models import UserModel
from src.auth.schemas import User
from src.auth.utils import hash_password
from src.repository import BaseRepository


class AuthRepository(BaseRepository):
    model = UserModel

    @staticmethod
    def get_all_users(db: Session) -> list[User]:
        query = select(UserModel)
        result = db.execute(query).scalars()
        users = [
            User.model_validate(row, from_attributes=True)
            for row in result
        ]

        return users


    @staticmethod
    def password_exist(password: str, db: Session) -> bool:
        password_hash = hash_password(password)
        user = db.execute(select(UserModel.hash_password).where(UserModel.hash_password == password_hash)).scalars().first()
        if not user:
            return False
        return True

class UserRepository(BaseRepository):
    model = UserModel