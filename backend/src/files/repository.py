from src.files.models import FileModel
from src.repository import BaseRepository


class FileRepository(BaseRepository):
    model = FileModel