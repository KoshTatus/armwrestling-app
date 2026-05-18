from typing import Optional

from pydantic import BaseModel


class FileSchema(BaseModel):
    id: Optional[int] = None
    name: str
    path: str
    application_id: int