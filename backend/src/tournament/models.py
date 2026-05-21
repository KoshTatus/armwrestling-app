from datetime import datetime, UTC
from sqlalchemy import Integer, String, TIMESTAMP, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base, int_pk

class MatchModel(Base):
    __tablename__ = "matches"

    id: Mapped[int_pk]
    competition_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    tournament_id: Mapped[str] = mapped_column(
        String, ForeignKey("tournaments.tournament_id", ondelete="CASCADE"), nullable=False
    )
    hand: Mapped[str] = mapped_column(String, nullable=False)
    age_category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("age_categories.id", ondelete="CASCADE"), nullable=False
    )
    weight_category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("weight_categories.id", ondelete="CASCADE"), nullable=False
    )
    round_num: Mapped[int] = mapped_column(nullable=False)
    bracket: Mapped[str] = mapped_column(String, nullable=False)
    match_number: Mapped[int] = mapped_column(nullable=False)
    first_participant_name: Mapped[str] = mapped_column(String, nullable=False)
    second_participant_name: Mapped[str] = mapped_column(String, nullable=True)
    winner_name: Mapped[str] = mapped_column(String, nullable=True)
    loser_name: Mapped[str] = mapped_column(String, nullable=True)
    is_bye: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.now(UTC))


class TournamentModel(Base):
    __tablename__ = "tournaments"

    id: Mapped[int_pk]
    tournament_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    competition_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    organizer_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=False
    )
    hand: Mapped[str] = mapped_column(String, nullable=False)
    age_category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("age_categories.id", ondelete="CASCADE"), nullable=False
    )
    weight_category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("weight_categories.id", ondelete="CASCADE"), nullable=False
    )
    participants_data: Mapped[str] = mapped_column(String, nullable=False)
    state_json: Mapped[str] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.now(UTC), onupdate=datetime.now(UTC))