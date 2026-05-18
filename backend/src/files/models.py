from sqlalchemy import ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base, int_pk


class FileModel(Base):
    __tablename__ = "files"

    id: Mapped[int_pk]
    name: Mapped[str] = mapped_column(nullable=False)
    path: Mapped[str] = mapped_column(nullable=False)
    application_id: Mapped[int] = mapped_column(Integer, ForeignKey("applications.id",  ondelete="CASCADE"))