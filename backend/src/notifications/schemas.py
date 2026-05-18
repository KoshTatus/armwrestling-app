from typing import Optional

from pydantic import BaseModel


class NotificationSchema(BaseModel):
    id: Optional[int] = None
    producer_id: int
    application_id: int
    text: Optional[str] = None