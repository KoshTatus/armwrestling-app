from typing import Optional

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from src.database import Base, int_pk


class ResultModel(Base):
    __tablename__ = 'results'

    id: Mapped[int_pk]
    participant_id: Mapped[int] = mapped_column(
        ForeignKey("applications.id", ondelete="CASCADE", onupdate="CASCADE"), nullable=False
    )
    left_hand_place: Mapped[Optional[int]] = mapped_column(nullable=True)
    right_hand_place: Mapped[Optional[int]] = mapped_column(nullable=True)