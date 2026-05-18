from src.applications.models import WeightCategoryModel
from src.repository import BaseRepository


class WeightCategoryRepository(BaseRepository):
    model = WeightCategoryModel