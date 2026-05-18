from fastapi import APIRouter, Body, UploadFile, Form, HTTPException, Query
from fastapi import Depends
from sqlalchemy.orm import Session

from src.competitions.weight_categories.repository import WeightCategoryRepository
from src.competitions.age_categories.repository import AgeCategoryRepository
from src.auth.schemas import UserBase
from src.auth.repository import AuthRepository
from src.applications.schemas import ApplicationDBSchema
from src.applications.repository import ApplicationRepository
from src.applications.schemas import ApplicationSchema
from src.applications.types import StatusCode
from src.auth.router import check_user_role
from src.auth.router import get_current_user
from src.auth.schemas import Role, UserInfo
from src.database.db import get_db
from src.files.repository import FileRepository
from src.files.schemas import FileSchema
from src.files.utils import save_upload_file

router = APIRouter()

router_user_applications = APIRouter()

@router_user_applications.get("/applications")
def get_user_applications(
        user_role = Depends(check_user_role),
        current_user: UserInfo = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    result = ApplicationRepository.find_all(db, **{"user_id": current_user.id})

    applications = [ApplicationSchema.model_validate(application, from_attributes=True) for application in result]

    for application in applications:
        file_results = FileRepository.find_all(db, **{"application_id": application.id})
        files_validate = [FileSchema.model_validate(row, from_attributes=True) for row in file_results]
        application.files = files_validate

    return {
        "data": applications,
    }

@router_user_applications.get("/applications/all")
def get_user_applications(
        user_role = Depends(check_user_role(Role.ORGANIZER)),
        db: Session = Depends(get_db)
):
    result = ApplicationRepository.find_all(db)

    applications = [ApplicationSchema.model_validate(application, from_attributes=True) for application in result]

    for application in applications:
        file_results = FileRepository.find_all(db, **{"application_id": application.id})
        files_validate = [FileSchema.model_validate(row, from_attributes=True) for row in file_results]
        application.files = files_validate
        result = AuthRepository.find_one_or_none_by_id(application.user_id, db)
        user = UserBase.model_validate(result, from_attributes=True)
        application.full_name = f"{user.surname} {user.name} {user.patronymic}"

    return {
        "data": applications,
    }

@router_user_applications.patch("/applications/all/{application_id}")
def update_application_status(
        application_id: int,
        status: StatusCode = Body(),
        user_role = Depends(check_user_role(Role.ORGANIZER)),
        db: Session = Depends(get_db)
):
    result = ApplicationRepository.update(
        {
            "id": application_id
        },
        db,
        **{
            "status": status
        }
    )

    return result

@router.post("/{competition_id}/application")
def create_application(
        competition_id: int,
        age_category_id: int = Form(),
        weight_category_id: int = Form(),
        rank_id: int = Form(),
        team: str = Form(),
        file1: UploadFile = Form(),
        file2: UploadFile = Form(),
        user_role=Depends(check_user_role(Role.PARTICIPANT)),
        current_user: UserInfo = Depends(get_current_user),
        db: Session = Depends(get_db)
):
    application = ApplicationDBSchema(
        competition_id=competition_id,
        age_category_id=age_category_id,
        weight_category_id=weight_category_id,
        rank_id=rank_id,
        team=team,
    )
    application.user_id = current_user.id
    application.competition_id = competition_id

    new_application = ApplicationRepository.add(db, **application.model_dump())

    files = [file1, file2]

    for file in files:
        file_path = save_upload_file(file)
        file_schema = FileSchema(
            name=file.filename,
            path=file_path,
            application_id=new_application.id,
        )

        FileRepository.add(db, **file_schema.model_dump())

    return new_application

@router.get("/{competition_id}/application")
def get_applications(
        competition_id,
        user_role = Depends(check_user_role(Role.ORGANIZER)),
        db: Session = Depends(get_db)
) -> list[ApplicationSchema]:
    result = ApplicationRepository.find_all(db, **{"competition_id": 1})

    applications = [ApplicationSchema.model_validate(application, from_attributes=True) for application in result]

    return applications

@router.patch("/{competition_id}/application/{application_id}")
def update_application_status(
        competition_id: int,
        application_id: int,
        status: StatusCode,
        user_role = Depends(check_user_role(Role.ORGANIZER)),
        db: Session = Depends(get_db)
):
    result = ApplicationRepository.update(
        {
            "competition_id": competition_id,
            "id": application_id
        },
        db,
        **{
            "status": status
        }
    )

    return result


@router.patch("/{competition_id}/application/{application_id}/weight")
def update_application_weight(
        competition_id: int,
        application_id: int,
        weight: float = Query(..., description="Вес участника в кг", ge=0, le=300),
        user_role=Depends(check_user_role(Role.ORGANIZER)),
        db: Session = Depends(get_db)
):
    """
    Обновление веса участника перед соревнованием
    """
    # Проверяем, что заявка принадлежит указанному соревнованию
    application = ApplicationRepository.find_one_or_none(
        db,
        id=application_id,
        competition_id=competition_id
    )

    if not application:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    # Обновляем вес
    result = ApplicationRepository.update(
        {"id": application_id, "competition_id": competition_id},
        db,
        weight=weight
    )

    if result == 0:
        raise HTTPException(status_code=404, detail="Не удалось обновить вес")

    # Возвращаем обновленные данные
    updated_application = ApplicationRepository.find_one_or_none_by_id(application_id, db)

    return {
        "data": {
            "id": application_id,
            "weight": weight
        },
        "message": "Вес успешно сохранен"
    }


@router.get("/{competition_id}/applications/approved")
def get_approved_applications_for_weighing(
        competition_id: int,
        user_role=Depends(check_user_role(Role.ORGANIZER)),
        db: Session = Depends(get_db)
):
    """
    Получение списка одобренных заявок для предстартового взвешивания
    Возвращает участников со статусом APPROVED (1)
    """
    # Получаем все одобренные заявки на соревнование
    approved_applications = ApplicationRepository.find_all(
        db,
        competition_id=competition_id,
        status=StatusCode.APPROVED  # 1 - статус APPROVED
    )

    result = []
    for application in approved_applications:
        # Получаем данные пользователя
        user = AuthRepository.find_one_or_none_by_id(application.user_id, db)

        # Получаем названия категорий
        age_category = AgeCategoryRepository.find_one_or_none_by_id(application.age_category_id, db)
        weight_category = WeightCategoryRepository.find_one_or_none_by_id(application.weight_category_id, db)

        # Формируем ФИО
        full_name = f"{user.surname} {user.name}"
        if user.patronymic:
            full_name += f" {user.patronymic}"

        result.append({
            "id": application.id,
            "application_id": application.id,
            "full_name": full_name,
            "age_category": age_category.name if age_category else "Не указана",
            "age_category_id": application.age_category_id,
            "weight_category": weight_category.name if weight_category else "Не указана",
            "weight_category_id": application.weight_category_id,
            "team": application.team,
            "rank_id": application.rank_id,
            "weight": application.weight,  # уже сохраненный вес (если есть)
            "status": application.status,
            "user_id": application.user_id
        })

    return {
        "data": result,
        "count": len(result)
    }