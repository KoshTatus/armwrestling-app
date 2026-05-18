from src.notifications.models import NotificationModel
from src.repository import BaseRepository


class NotificationRepository(BaseRepository):
    model = NotificationModel