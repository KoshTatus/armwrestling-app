from datetime import date

import enum
from sqlalchemy import Date, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from src.database import int_pk
from src.database.db import Base


class Gender(enum.Enum):
    MALE = 1
    FEMALE = 2


class RoleModel(Base):
    __tablename__ = "roles"

    id: Mapped[int_pk]
    name: Mapped[str] = mapped_column(nullable=False)


class UserModel(Base):
    __tablename__ = "users"

    id: Mapped[int_pk]
    login: Mapped[str] = mapped_column(nullable=False)
    hash_password: Mapped[str] = mapped_column(nullable=False)
    name: Mapped[str] = mapped_column(nullable=False)
    surname: Mapped[str] = mapped_column(nullable=False)
    patronymic: Mapped[str] = mapped_column(nullable=False)
    birth_date: Mapped[date] = mapped_column(Date, nullable=False)
    gender: Mapped[Gender] = mapped_column(nullable=False)
    role_id: Mapped[int] = mapped_column(ForeignKey('roles.id', ondelete="SET NULL"), nullable=False, default=1)

