from sqlalchemy.orm import Session

from src.auth.models import Gender
from src.auth.errors import AuthErrors
from src.auth.jwt_auth.base.auth import JWTAuth
from src.auth.repository import AuthRepository
from src.auth.schemas import UserRegisterForm, UserCreate, UserLoginForm, User
from src.auth.utils import hash_password


class AuthService:
    def __init__(self, jwt_auth: JWTAuth):
        self.jwt_auth = jwt_auth

    def register(self, user: UserRegisterForm, db: Session):
        if AuthRepository.find_one_or_none(db, **{"login" : user.login}):
            raise AuthErrors.get_login_occupied_error()

        user_info = UserCreate(
                login=user.login,
                hash_password=hash_password(user.password),
                name=user.name,
                surname=user.surname,
                patronymic=user.patronymic,
                birth_date=user.birth_date,
                gender=Gender.MALE if user.gender == 0 else Gender.FEMALE,
            )

        new_user = AuthRepository.add(db, **user_info.model_dump())

        token = self.jwt_auth.generate_token(
            payload={
                "id" : new_user.id,
                "role_id" : new_user.role_id,
            }
        )
        return token

    def login(self, user: UserLoginForm, db: Session):
        result = AuthRepository.find_one_or_none(db, **{"login" : user.login})

        if not result:
            raise AuthErrors.get_login_not_found_error()
        if not AuthRepository.password_exist(user.password, db):
            raise AuthErrors.get_password_not_found_error()

        user = User.model_validate(result, from_attributes=True)

        token = self.jwt_auth.generate_token(
            payload={
                "id": user.id,
                "role_id": user.role_id,
            }
        )

        return token