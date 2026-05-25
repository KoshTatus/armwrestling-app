from sqlalchemy import select, func, case
from sqlalchemy.orm import Session

from src.applications.types import StatusCode
from src.results.models import ResultModel
from src.competitions.schemas import StartlistSchema
from src.applications.models import WeightCategoryModel, RankModel, AgeCategoryModel, ApplicationModel
from src.auth.models import UserModel
from src.competitions.schemas import CompetitionCategoriesSchema
from src.competitions.models import CompetitionModel
from src.repository import BaseRepository


class CompetitionRepository(BaseRepository):
    model = CompetitionModel

    @staticmethod
    def add_category_for_competition(
            competition_category: CompetitionCategoriesSchema,
            db: Session
    ):
        category = CompetitionCategoriesModel(**competition_category.model_dump())

        db.add(category)
        db.commit()
        db.refresh(category)

        new_category = CompetitionCategoriesSchema.model_validate(category, from_attributes=True)

        return new_category

    @staticmethod
    def get_startlist_for_competition(
            competition_id: int,
            db: Session
    ):
        surname_case = case(
            (ApplicationModel.user_id.isnot(None), UserModel.surname),
            else_=ApplicationModel.surname
        ).label("surname")

        name_case = case(
            (ApplicationModel.user_id.isnot(None), UserModel.name),
            else_=ApplicationModel.name
        ).label("name")

        query = (
            select(
                AgeCategoryModel.name.label("age_category"),
                WeightCategoryModel.name.label("weight_category"),
                surname_case,
                name_case,
                RankModel.name.label("rank"),
                ApplicationModel.team
            )
            .select_from(ApplicationModel)
            .outerjoin(UserModel, ApplicationModel.user_id == UserModel.id)
            .join(WeightCategoryModel, ApplicationModel.weight_category_id == WeightCategoryModel.id)
            .join(AgeCategoryModel, ApplicationModel.age_category_id == AgeCategoryModel.id)
            .join(RankModel, ApplicationModel.rank_id == RankModel.id)
            .where(ApplicationModel.competition_id == competition_id)
            .where(ApplicationModel.status == StatusCode.APPROVED)
            .order_by(
                AgeCategoryModel.id,
                WeightCategoryModel.id,
                surname_case,
                name_case
            )
        )

        result = db.execute(query).all()

        grouped_result = []
        current_age_category = None
        current_age_group = None
        current_weight_category = None
        current_weight_group = None

        for row in result:
            if row.age_category != current_age_category:
                if current_weight_group:
                    current_age_group["weight_categories"].append(current_weight_group)
                if current_age_group:
                    grouped_result.append(current_age_group)

                current_age_group = {
                    "age_category": row.age_category,
                    "weight_categories": []
                }
                current_age_category = row.age_category
                current_weight_category = None
                current_weight_group = None

            if row.weight_category != current_weight_category:
                if current_weight_group:
                    current_age_group["weight_categories"].append(current_weight_group)
                current_weight_group = {
                    "weight_category": row.weight_category,
                    "participants": []
                }
                current_weight_category = row.weight_category

            current_weight_group["participants"].append({
                "surname": row.surname or "",
                "name": row.name or "",
                "rank": row.rank,
                "team": row.team
            })

        if current_weight_group:
            current_age_group["weight_categories"].append(current_weight_group)
        if current_age_group:
            grouped_result.append(current_age_group)

        return grouped_result