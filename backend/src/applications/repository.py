from src.applications.models import ApplicationModel
from src.repository import BaseRepository


class ApplicationRepository(BaseRepository):
    model = ApplicationModel