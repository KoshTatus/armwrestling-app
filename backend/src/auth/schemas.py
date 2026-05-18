import datetime

from psycopg.types import enum
from pydantic import BaseModel, Field, field_validator

from src.auth.models import Gender

class Role(int, enum.Enum):
    PARTICIPANT = 1
    ORGANIZER = 2
    ADMIN = 3

class UserBase(BaseModel):
    login: str
    name: str
    surname: str
    patronymic: str
    birth_date: datetime.date
    gender: Gender | int
    @classmethod
    @field_validator("birth_date")
    def check_birth_date(cls, value):
        if value < datetime.date.today():
            raise ValueError("Дата рождения не может быть больше текущей даты!")
        return value

class UserRegisterForm(UserBase):
    password: str = Field(min_length=4)

class UserLoginForm(BaseModel):
    login: str = Field(default="1@mail.ru")
    password: str = Field(default="11111111")

class UserCreate(UserBase):
    hash_password: str

class User(UserCreate):
    id: int
    role_id: int

class UserInfo(BaseModel):
    id: int
    role_id: int