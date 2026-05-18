import datetime

from fastapi import APIRouter, Depends, status, Response, HTTPException, Body
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session

from src.auth.schemas import UserBase
from src.auth.models import Gender
from src.settings import settings
from src.auth.jwt_auth.base.auth import JWTAuth
from src.auth.jwt_auth.base.config import JWTConfig
from src.auth.jwt_auth.utils import try_to_decode_token
from src.auth.repository import AuthRepository, UserRepository
from src.auth.schemas import UserInfo, UserRegisterForm, UserLoginForm, Role
from src.auth.service import AuthService
from src.database.db import get_db

http_bearer = HTTPBearer()

router = APIRouter(
    prefix="/auth",
    tags=["auth"]
)


def get_auth_service():
    return AuthService(jwt_auth=JWTAuth(config=JWTConfig()))

def check_user_role(role_id: int = Role.PARTICIPANT):
    def dependency(
            credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
            auth_service: AuthService = Depends(get_auth_service),
    ) -> UserInfo:
        token = credentials.credentials
        payload = try_to_decode_token(auth_service.jwt_auth, token)

        result = UserInfo(
            id=payload.get("id"),
            role_id=payload.get("role_id")
        )

        if role_id > result.role_id:
            raise HTTPException(status_code=403, detail="No access rights")

        return result

    return dependency

def get_current_user(
            credentials: HTTPAuthorizationCredentials = Depends(http_bearer),
            auth_service: AuthService = Depends(get_auth_service),
) -> UserInfo:
    token = credentials.credentials
    payload = try_to_decode_token(auth_service.jwt_auth, token)

    result = UserInfo(
        id=payload.get("id"),
        role_id=payload.get("role_id")
    )

    return result

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register_user(
        user: UserRegisterForm,
        response: Response,
        auth_service: AuthService = Depends(get_auth_service),
        db: Session = Depends(get_db)
):
    data = auth_service.register(user, db)

    response.set_cookie(
        key="token",
        value=data,
        max_age=settings.access_token_expire_seconds,
    )
    

    return {
        "data": {
            "token": data
        }
    }


@router.post("/login", status_code=status.HTTP_200_OK)
def login_user(
        user: UserLoginForm,
        response: Response,
        auth_service: AuthService = Depends(get_auth_service),
        db: Session = Depends(get_db)
):
    data = auth_service.login(user, db)

    response.set_cookie(
        key="token",
        value=data,
        max_age=settings.access_token_expire_seconds,
    )

    return {
        "data" : {
            "token": data
        }
    }


user_router = APIRouter(
    prefix="/users",
)

@user_router.get("/{id}")
def get_user_by_id(id: int, db: Session = Depends(get_db), user_role = Depends(check_user_role(Role.PARTICIPANT))):
    user = AuthRepository.find_one_or_none_by_id(id, db)

    return {
        "data" : user
    }

@user_router.patch("/{id}")
def update_user_info(
    login: str = Body(),
    name: str = Body(),
    surname: str = Body(),
    patronymic: str = Body(),
    birth_date: datetime.date = Body(),
    gender: Gender | int = Body(),
    current_user: UserInfo = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    result = UserRepository.update(
        {
            "id": current_user.id
        },
        db,
        **{
            "login": login,
            "name": name,
            "surname": surname,
            "patronymic": patronymic,
            "birth_date": birth_date,
            "gender": Gender(gender),
        }
    )

    new_user = UserRepository.find_one_or_none_by_id(current_user.id, db)
    user_info = UserBase.model_validate(new_user, from_attributes=True)

    return user_info
