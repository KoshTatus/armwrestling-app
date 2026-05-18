from typing import Any, Generic, TypeVar
from sqlalchemy import delete as sqlalchemy_delete
from sqlalchemy import select
from sqlalchemy import update as sqlalchemy_update
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from src.database.db import Base

T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    model: type[T]

    @classmethod
    def find_all(cls, db: Session, **filter_by: Any) -> list[T]:
        query = select(cls.model).filter_by(**filter_by)
        result = db.execute(query)
        return list(result.scalars().all())

    @classmethod
    def find_one_or_none_by_id(cls, data_id: int, db: Session) -> T | None:
        query = select(cls.model).filter_by(id=data_id)
        result = db.execute(query)
        return result.scalar_one_or_none()

    @classmethod
    def find_one_or_none(cls, db: Session, **filter_by: Any) -> T | None:
        query = select(cls.model).filter_by(**filter_by)
        result = db.execute(query)
        return result.scalar_one_or_none()

    @classmethod
    def add(cls, db: Session, **values: Any) -> T:
        new_instance = cls.model(**values)
        db.add(new_instance)
        try:
            db.commit()
            db.refresh(new_instance)
            return new_instance
        except SQLAlchemyError as e:
            db.rollback()
            raise e

    @classmethod
    def update(cls, filter_by: dict[str, Any], db: Session, **values: Any) -> int:
        query = (
            sqlalchemy_update(cls.model)
            .where(*[getattr(cls.model, k) == v for k, v in filter_by.items()])
            .values(**values)
            .execution_options(synchronize_session="fetch")
        )
        result = db.execute(query)
        try:
            db.commit()
            return result.rowcount
        except SQLAlchemyError as e:
            db.rollback()
            raise e

    @classmethod
    def delete(cls, db: Session, delete_all: bool = False, **filter_by: Any) -> int:
        if not delete_all and not filter_by:
            raise ValueError("Необходимо указать хотя бы один параметр для удаления")

        query = sqlalchemy_delete(cls.model).filter_by(**filter_by)
        result = db.execute(query)
        try:
            db.commit()
            return result.rowcount
        except SQLAlchemyError as e:
            db.rollback()
            raise e