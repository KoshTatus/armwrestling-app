from fastapi import APIRouter, Depends, Body
from sqlalchemy.orm import Session

from src.applications.repository import ApplicationRepository
from src.auth.repository import AuthRepository
from src.database.db import get_db
from src.notifications.schemas import NotificationSchema
from src.notifications.repository import NotificationRepository
from src.auth.router import check_user_role
from src.auth.schemas import Role
from src.notifications.email_sender import email_sender

router = APIRouter(
    prefix="/notifications",
)


@router.post("/{application_id}")
async def send_competition_notification(
        application_id: int,
        text: str = Body(),
        current_user = Depends(check_user_role(Role.ORGANIZER)),
        db: Session = Depends(get_db)
):
    notification = NotificationSchema(application_id=application_id, producer_id=current_user.id, text=text)
    new_notification = NotificationRepository.add(db, **notification.model_dump())

    application = ApplicationRepository.find_one_or_none_by_id(application_id, db)
    user = AuthRepository.find_one_or_none_by_id(application.user_id, db)
    user_email = user.login

    await email_sender.send_text_email(user_email, "Федерация Армрестлинга УР", text)

    return new_notification
