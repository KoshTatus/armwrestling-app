# src/bracket_double_elimination/models.py
from datetime import datetime
from typing import Optional
from sqlalchemy import ForeignKey, Integer, String, DateTime, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column
import enum

from src.database import int_pk, Base


class TournamentStatus(str, enum.Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class MatchStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BYE = "bye"


class DoubleEliminationTournament(Base):
    """Турнир с выбыванием после двух поражений"""
    __tablename__ = "double_elimination_tournaments"

    id: Mapped[int_pk]
    competition_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("competitions.id", ondelete="CASCADE"), nullable=False
    )
    weight_category_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("weight_categories.id", ondelete="CASCADE"), nullable=False
    )
    status: Mapped[TournamentStatus] = mapped_column(
        SQLEnum(TournamentStatus), nullable=False, default=TournamentStatus.PENDING
    )
    current_round: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    tournament_finished: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    waiting_for_final: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    grand_final_winner_needs_second: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, default=datetime.utcnow,
                                                 onupdate=datetime.utcnow)


class TournamentParticipant(Base):
    """Участник турнира"""
    __tablename__ = "tournament_participants"

    id: Mapped[int_pk]
    tournament_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("double_elimination_tournaments.id", ondelete="CASCADE"), nullable=False
    )
    application_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("applications.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    wins: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    losses: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    eliminated: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    is_in_winners_bracket: Mapped[int] = mapped_column(Integer, nullable=False, default=1)


class TournamentMatch(Base):
    """Матч турнира"""
    __tablename__ = "tournament_matches"

    id: Mapped[int_pk]
    tournament_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("double_elimination_tournaments.id", ondelete="CASCADE"), nullable=False
    )
    round_number: Mapped[int] = mapped_column(Integer, nullable=False)
    match_number: Mapped[int] = mapped_column(Integer, nullable=False)
    bracket: Mapped[str] = mapped_column(String(50), nullable=False)  # winners, losers, grand_final, grand_final_2

    first_participant_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("tournament_participants.id", ondelete="SET NULL"), nullable=True
    )
    second_participant_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("tournament_participants.id", ondelete="SET NULL"), nullable=True
    )
    winner_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("tournament_participants.id", ondelete="SET NULL"), nullable=True
    )
    loser_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("tournament_participants.id", ondelete="SET NULL"), nullable=True
    )

    status: Mapped[MatchStatus] = mapped_column(
        SQLEnum(MatchStatus), nullable=False, default=MatchStatus.SCHEDULED
    )

    # Результаты
    first_participant_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    second_participant_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)