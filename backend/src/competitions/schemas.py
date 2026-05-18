from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class CompetitionSchema(BaseModel):
    id: Optional[int] = None
    title: str
    venue: str
    date: Optional[datetime] = None
    organizer_id: Optional[int] = None


class CompetitionCategoriesSchema(BaseModel):
    id: Optional[int] = None
    competition_id: int
    age_category_id: int
    weight_category_id: int

class StartlistSchema(BaseModel):
    name: str
    surname: str
    weight_category: str
    age_category: str
    rank: str
    team: str
