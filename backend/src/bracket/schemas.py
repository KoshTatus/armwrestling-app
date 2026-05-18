# src/bracket/schemas.py
from typing import Optional, List, Any, Dict
from pydantic import BaseModel, field_validator
from datetime import datetime
from enum import Enum


class BracketStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class MatchStatus(str, Enum):
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BYE = "bye"


class MatchResultSchema(BaseModel):
    """Результат матча"""
    winner_id: int
    score_p1: int = 3
    score_p2: int = 0


class CreateMatchSchema(BaseModel):
    """Создание матча"""
    participant1_id: Optional[int] = None
    participant2_id: Optional[int] = None


class ParticipantInfoSchema(BaseModel):
    """Информация об участнике для сетки"""
    id: int
    full_name: str
    team: str
    rank: str
    loss_count: int = 0


class MatchSchema(BaseModel):
    id: int
    bracket_id: int
    round_number: int
    match_number: int
    participant1_id: Optional[int] = None
    participant2_id: Optional[int] = None
    winner_id: Optional[int] = None
    loser1_id: Optional[int] = None
    participant1_score: int = 0
    participant2_score: int = 0
    next_winner_match_id: Optional[int] = None
    next_loser_match_id: Optional[int] = None
    status: MatchStatus
    is_final: bool = False  # В схеме оставляем bool для удобства
    loss_count_p1: int = 0
    loss_count_p2: int = 0

    class Config:
        from_attributes = True

    @field_validator('is_final', mode='before')
    @classmethod
    def validate_is_final(cls, v):
        if isinstance(v, int):
            return bool(v)
        return v


class BracketSchema(BaseModel):
    id: int
    competition_id: int
    weight_category_id: int
    status: BracketStatus
    current_round: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class BracketListSchema(BracketSchema):
    """Схема для списка сеток с дополнительной информацией"""
    participants_count: int = 0


class BracketDetailSchema(BracketSchema):
    """Детальная схема сетки с матчами"""
    matches: List[MatchSchema] = []
    participant_losses: Dict[int, int] = {}


class MatchDetailSchema(BaseModel):
    """Детальная информация о матче"""
    id: int
    round_number: int
    match_number: int
    participant1: Optional[ParticipantInfoSchema] = None
    participant2: Optional[ParticipantInfoSchema] = None
    winner: Optional[ParticipantInfoSchema] = None
    participant1_score: int = 0
    participant2_score: int = 0
    status: MatchStatus
    is_final: bool = False
    next_winner_match: Optional[int] = None
    next_loser_match: Optional[int] = None

    class Config:
        from_attributes = True