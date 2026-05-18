from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class StartTournamentRequest(BaseModel):
    age_category_id: int
    weight_category_id: int
    hand: str  # 'left' или 'right'


class StartTournamentResponse(BaseModel):
    tournament_id: str


class TournamentMatchSchema(BaseModel):
    id: Optional[int] = None
    competition_id: int
    tournament_id: str
    hand: str
    age_category_id: int
    weight_category_id: int
    round_num: int
    bracket: str
    match_number: int
    first_participant_name: str
    second_participant_name: Optional[str] = None
    winner_name: Optional[str] = None
    loser_name: Optional[str] = None
    is_bye: bool = False
    created_at: Optional[datetime] = None