from datetime import datetime, UTC

from sqlalchemy import ForeignKey, TIMESTAMP, Integer, Numeric
from sqlalchemy.orm import Mapped, mapped_column

from src.applications.types import StatusCode
from src.database.db import Base
from src.database.models import int_pk


class RankModel(Base):
    __tablename__ = "ranks"

    id: Mapped[int_pk]
    name: Mapped[str] = mapped_column(nullable=False)


class AgeCategoryModel(Base):
    __tablename__ = "age_categories"

    id: Mapped[int_pk]
    name: Mapped[str] = mapped_column(nullable=False)
    min_year: Mapped[int] = mapped_column(nullable=False)
    max_year: Mapped[int] = mapped_column(nullable=True)


class WeightCategoryModel(Base):
    __tablename__ = "weight_categories"

    id: Mapped[int_pk]
    name: Mapped[str] = mapped_column(nullable=False)
    min_weight: Mapped[int] = mapped_column(nullable=False)
    max_weight: Mapped[int] = mapped_column(nullable=True)


class ApplicationModel(Base):
    __tablename__ = "applications"

    id: Mapped[int_pk]
    age_category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("age_categories.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    weight_category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("weight_categories.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    user_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    competition_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    weight: Mapped[Numeric] = mapped_column(Numeric(precision=5, scale=2), nullable=True)
    rank_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("ranks.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    team: Mapped[str] = mapped_column(nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, nullable=False, default=datetime.now(UTC)
    )
    update_at: Mapped[datetime] = mapped_column(
        TIMESTAMP, nullable=False, default=datetime.now(UTC), onupdate=datetime.now(UTC)
    )
    status: Mapped[StatusCode] = mapped_column(nullable=False, default=StatusCode.PENDING)