from fastapi import APIRouter, Body, UploadFile, Form, HTTPException, Query
from fastapi import Depends
from sqlalchemy.orm import Session
from sqlalchemy.sql.functions import current_user
from starlette import status

from src.auth.models import UserModel
from src.applications.models import ApplicationModel, RankModel, WeightCategoryModel, AgeCategoryModel
from src.competitions.models import CompetitionModel
from src.competitions.weight_categories.repository import WeightCategoryRepository
from src.competitions.age_categories.repository import AgeCategoryRepository
from src.auth.schemas import UserBase
from src.auth.repository import AuthRepository
from src.applications.schemas import ApplicationDBSchema, ManualApplicationCreateSchema
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
        if application.user_id:
            user = UserBase.model_validate(result, from_attributes=True)
            application.full_name = f"{user.surname} {user.name} {user.patronymic}"
        else:
            application.full_name = f"{application.surname} {application.name} {application.patronymic}"

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
    application = ApplicationRepository.find_one_or_none(
        db,
        id=application_id,
        competition_id=competition_id
    )

    if not application:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    result = ApplicationRepository.update(
        {"id": application_id, "competition_id": competition_id},
        db,
        weight=weight
    )

    if result == 0:
        raise HTTPException(status_code=404, detail="Не удалось обновить вес")

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
    approved_applications = ApplicationRepository.find_all(
        db,
        competition_id=competition_id,
        status=StatusCode.APPROVED
    )

    result = []
    for app in approved_applications:
        if app.user_id:
            user = db.query(UserModel).filter(UserModel.id == app.user_id).first()
            surname = user.surname if user else app.surname
            name = user.name if user else app.name
            patronymic = user.patronymic if user else app.patronymic
        else:
            surname = app.surname
            name = app.name
            patronymic = app.patronymic

        full_name = f"{surname} {name} {patronymic or ''}".strip()
        result.append({
            "application_id": app.id,
            "full_name": full_name,
            "weight_category": db.query(WeightCategoryModel).filter(
                WeightCategoryModel.id == app.weight_category_id).first().name,
            "weight_category_id": app.weight_category_id,
            "age_category": db.query(AgeCategoryModel).filter(AgeCategoryModel.id == app.age_category_id).first().name,
            "team": app.team,
            "weight": app.weight
        })
    return {
        "data": result,
    }


@router.patch("/{application_id}/weight-category")
def update_application_weight_category(
        application_id: int,
        new_category_id: int,
        db: Session = Depends(get_db),
        current_user=Depends(check_user_role(Role.ORGANIZER))
):
    app = ApplicationRepository.find_one_or_none_by_id(application_id, db)
    if not app:
        raise HTTPException(status_code=404, detail="Заявка не найдена")

    new_category = WeightCategoryRepository.find_one_or_none_by_id(new_category_id, db)
    if not new_category:
        raise HTTPException(status_code=400, detail="Некорректная весовая категория")

    app.weight_category_id = new_category_id
    db.commit()
    db.refresh(app)

    return {
        "message": "Весовая категория обновлена",
        "application_id": app.id,
        "new_category": new_category.name,
        "new_category_id": new_category.id
    }

@router.delete("/{application_id}")
def delete_application(
        application_id: int,
        db: Session = Depends(get_db),
):
    ApplicationRepository.delete(db, False, **{"id": application_id})

    return {
        "data": f"Application {application_id} was deleted",
    }


@router.post("/manual", status_code=status.HTTP_201_CREATED)
def create_manual_application(
    app_data: ManualApplicationCreateSchema,
    db: Session = Depends(get_db),
    current_user = Depends(check_user_role(Role.ORGANIZER))
):
    competition = db.query(CompetitionModel).filter(CompetitionModel.id == app_data.competition_id).first()
    if not competition:
        raise HTTPException(status_code=404, detail="Соревнование не найдено")

    age_cat = db.query(AgeCategoryModel).filter(AgeCategoryModel.id == app_data.age_category_id).first()
    if not age_cat:
        raise HTTPException(status_code=400, detail="Некорректная возрастная категория")
    weight_cat = db.query(WeightCategoryModel).filter(WeightCategoryModel.id == app_data.weight_category_id).first()
    if not weight_cat:
        raise HTTPException(status_code=400, detail="Некорректная весовая категория")
    rank = db.query(RankModel).filter(RankModel.id == app_data.rank_id).first()
    if not rank:
        raise HTTPException(status_code=400, detail="Некорректное спортивное звание")

    new_app = ApplicationModel(
        competition_id=app_data.competition_id,
        age_category_id=app_data.age_category_id,
        weight_category_id=app_data.weight_category_id,
        rank_id=app_data.rank_id,
        team=app_data.team,
        weight=app_data.weight,
        status=StatusCode.APPROVED,
        user_id=None,
        surname=app_data.surname,
        name=app_data.name,
        patronymic=app_data.patronymic
    )
    db.add(new_app)
    db.commit()
    db.refresh(new_app)

    return {
        "message": "Участник успешно добавлен",
        "application_id": new_app.id,
        "full_name": f"{app_data.surname} {app_data.name} {app_data.patronymic or ''}".strip()
    }