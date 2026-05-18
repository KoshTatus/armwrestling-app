from datetime import datetime

from sqlalchemy import ForeignKey, Integer, UniqueConstraint
from sqlalchemy.orm import mapped_column, Mapped

from src.database import int_pk, Base


class CompetitionModel(Base):
    __tablename__ = "competitions"

    id: Mapped[int_pk]
    title: Mapped[str] = mapped_column(nullable=False)
    venue: Mapped[str] = mapped_column(nullable=False)
    date: Mapped[datetime] = mapped_column(nullable=True)
    organizer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )

class CompetitionCategoriesModel(Base):
    __tablename__ = "competition_categories"

    id: Mapped[int_pk]
    competition_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("competitions.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    age_category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("age_categories.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    weight_category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("weight_categories.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )

    __table_args__ = (
        UniqueConstraint('age_category_id', 'weight_category_id', name='uix_age_weight'),
    )