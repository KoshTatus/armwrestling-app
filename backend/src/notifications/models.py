from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from src.database import int_pk, Base


class NotificationModel(Base):
    __tablename__ = 'notifications'

    id: Mapped[int_pk]
    producer_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    application_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    text: Mapped[str] = mapped_column()