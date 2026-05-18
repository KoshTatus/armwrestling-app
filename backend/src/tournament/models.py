from sqlalchemy import Integer, String, TIMESTAMP, Boolean, JSON, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from datetime import datetime, UTC

from src.database import Base, int_pk


class TournamentMatchModel(Base):
    __tablename__ = "tournament_matches"

    id: Mapped[int_pk]
    competition_id: Mapped[int] = mapped_column(Integer, nullable=False)
    tournament_id: Mapped[str] = mapped_column(String, nullable=False)
    hand: Mapped[str] = mapped_column(String, nullable=False)
    age_category_id: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_category_id: Mapped[int] = mapped_column(Integer, nullable=False)
    round_num: Mapped[int] = mapped_column(nullable=False)
    bracket: Mapped[str] = mapped_column(String, nullable=False)
    match_number: Mapped[int] = mapped_column(nullable=False)
    first_participant_name: Mapped[str] = mapped_column(String, nullable=False)
    second_participant_name: Mapped[str] = mapped_column(String, nullable=True)
    winner_name: Mapped[str] = mapped_column(String, nullable=True)
    loser_name: Mapped[str] = mapped_column(String, nullable=True)
    is_bye: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.now(UTC))


class ActiveTournamentModel(Base):
    __tablename__ = "active_tournaments"

    id: Mapped[int_pk]
    tournament_id: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    competition_id: Mapped[int] = mapped_column(Integer, nullable=False)
    organizer_id: Mapped[int] = mapped_column(Integer, nullable=False)  # кто создал
    hand: Mapped[str] = mapped_column(String, nullable=False)
    age_category_id: Mapped[int] = mapped_column(Integer, nullable=False)
    weight_category_id: Mapped[int] = mapped_column(Integer, nullable=False)
    participants_data: Mapped[str] = mapped_column(String, nullable=False)  # JSON
    state_json: Mapped[str] = mapped_column(String, nullable=True)  # JSON полного состояния
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.now(UTC))
    updated_at: Mapped[datetime] = mapped_column(TIMESTAMP, nullable=False, default=datetime.now(UTC), onupdate=datetime.now(UTC))