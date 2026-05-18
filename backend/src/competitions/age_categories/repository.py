from src.applications.models import AgeCategoryModel
from src.repository import BaseRepository


class AgeCategoryRepository(BaseRepository):
    model = AgeCategoryModel