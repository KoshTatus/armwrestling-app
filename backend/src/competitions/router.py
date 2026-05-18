from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from src.applications.router import router as applications_router
from src.applications.schemas import AgeCategorySchema, WeightCategorySchema
from src.applications.schemas import RankSchema
from src.auth.router import check_user_role
from src.auth.schemas import Role
from src.competitions.age_categories.repository import AgeCategoryRepository
from src.competitions.ranks.repository import RankRepository
from src.competitions.repository import CompetitionRepository
from src.competitions.schemas import CompetitionSchema, CompetitionCategoriesSchema
from src.competitions.weight_categories.repository import WeightCategoryRepository
from src.database.db import get_db

router = APIRouter(
    prefix="/competitions",
    tags=["competitions"]
)

router.include_router(applications_router, tags=["applications"])

@router.get('/age_categories')
def get_age_categories(
        id: Optional[int] = Query(default=None),
        db: Session = Depends(get_db)
):
    if id is None:
        params = {}
    else:
        params = {"id":id}
    result = AgeCategoryRepository.find_all(db, **params)

    age_categories = [
        AgeCategorySchema.model_validate(category, from_attributes=True) for category in result
    ]

    return {
        "data" : age_categories,
    }


@router.get('/weight_categories')
def get_weight_categories(
        id: Optional[int] = Query(default=None),
        db: Session = Depends(get_db)
):
    if id is None:
        params = {}
    else:
        params = {"id":id}
    result = WeightCategoryRepository.find_all(db, **params)

    weight_categories = [
        WeightCategorySchema.model_validate(category, from_attributes=True) for category in result
    ]

    return {
        "data" : weight_categories,
    }

@router.get('/ranks')
def get_ranks(
        id: Optional[int] = Query(default=None),
        db: Session = Depends(get_db)
):
    if id is None:
        params = {}
    else:
        params = {"id":id}
    result = RankRepository.find_all(db, **params)

    ranks = [
        RankSchema.model_validate(rank, from_attributes=True) for rank in result
    ]

    return {
        "data" : ranks,
    }

@router.get('/')
def get_competitions(
        db: Session = Depends(get_db)
) -> dict[str, list[CompetitionSchema]]:
    result = CompetitionRepository.find_all(db)
    competitions = [
        CompetitionSchema.model_validate(competition, from_attributes=True)
        for competition in result
    ]

    return {
        "data": competitions,
    }

@router.post('/')
def create_competition(
        competition: CompetitionSchema,
        current_user = Depends(check_user_role(Role.ORGANIZER)),
        db: Session = Depends(get_db)
):
    competition.organizer_id = current_user.id
    new_competition = CompetitionRepository.add(db, **competition.model_dump())

    return new_competition



@router.get('/{competition_id}')
def get_competition_info(
        competition_id: int,
        db: Session = Depends(get_db)
) -> dict[str, CompetitionSchema]:
    result = CompetitionRepository.find_one_or_none_by_id(competition_id, db)

    if result is None:
        raise HTTPException(status_code=404, detail="Competition not found")

    competition = CompetitionSchema.model_validate(result, from_attributes=True)

    return {
        "data" : competition
    }

@router.post('/{competition_id}/category')
def add_competition_category(
        category: CompetitionCategoriesSchema,
        current_user = Depends(check_user_role(Role.ORGANIZER)),
        db: Session = Depends(get_db)
) -> dict[str, CompetitionCategoriesSchema]:
    new_category = CompetitionRepository.add_category_for_competition(category, db)

    return {
        "data" : new_category,
    }

@router.get('/{competition_id}/list')
def get_competition_list(
        competition_id: int,
        db: Session = Depends(get_db)
):
    result = CompetitionRepository.get_startlist_for_competition(competition_id, db)

    if result is None:
        raise HTTPException(status_code=404, detail="Competition not found")

    return {
        "data" : result
    }