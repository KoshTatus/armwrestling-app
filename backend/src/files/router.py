import os
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from starlette.responses import FileResponse, StreamingResponse

from src.database.db import get_db
from src.files.repository import FileRepository
from src.files.schemas import FileSchema

router = APIRouter(
    prefix="/files",
)

@router.get("/{file_id}")
def download_file(
    file_id: int,
    db: Session = Depends(get_db)
):
    result = FileRepository.find_one_or_none_by_id(file_id, db)
    file = FileSchema.model_validate(result, from_attributes=True)
    if not file:
        raise HTTPException(status_code=404, detail="File not found in db")

    file_path = file.path
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found on server")

    response = FileResponse(file_path, media_type="application/octet-stream", filename=file.name)

    return response