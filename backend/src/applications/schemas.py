from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field

from src.files.schemas import FileSchema
from src.applications.types import StatusCode
from src.auth.models import Gender


class RankSchema(BaseModel):
    id: int
    name: str

class AgeCategorySchema(BaseModel):
    id: Optional[int] = None
    name: str
    min_year: int
    max_year: Optional[int] = None


class WeightCategorySchema(BaseModel):
    id: Optional[int] = None
    name: str
    min_weight: int
    max_weight: Optional[int] = None

class ApplicationDBSchema(BaseModel):
    id: Optional[int] = None
    age_category_id: int
    weight_category_id: int
    user_id: Optional[int] = None
    competition_id: Optional[int] = None
    weight: Optional[float] = None
    rank_id: int
    team: str
    created_at: Optional[datetime] = None
    update_at: Optional[datetime] = None
    status: Optional[StatusCode] = None

class ApplicationSchema(ApplicationDBSchema):
    files: Optional[list[FileSchema]] = None
    full_name: Optional[str] = None