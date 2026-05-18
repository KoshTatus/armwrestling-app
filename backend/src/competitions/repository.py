from sqlalchemy import select, func, case
from sqlalchemy.orm import Session

from src.results.models import ResultModel
from src.competitions.schemas import StartlistSchema
from src.applications.models import WeightCategoryModel, RankModel, AgeCategoryModel, ApplicationModel
from src.auth.models import UserModel
from src.competitions.schemas import CompetitionCategoriesSchema
from src.competitions.models import CompetitionCategoriesModel, CompetitionModel
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
        query = (
            select(
                AgeCategoryModel.name.label("age_category"),
                WeightCategoryModel.name.label("weight_category"),
                UserModel.surname,
                UserModel.name,
                RankModel.name.label("rank"),
                ApplicationModel.team
            )
            .select_from(ApplicationModel)
            .join(UserModel, ApplicationModel.user_id == UserModel.id)
            .join(WeightCategoryModel, ApplicationModel.weight_category_id == WeightCategoryModel.id)
            .join(AgeCategoryModel, ApplicationModel.age_category_id == AgeCategoryModel.id)
            .join(RankModel, ApplicationModel.rank_id == RankModel.id)
            .where(ApplicationModel.status == "APPROVED")
            .order_by(
                AgeCategoryModel.id,
                WeightCategoryModel.id,
                UserModel.surname,
                UserModel.name
            )
        )

        if competition_id:
            query = query.where(ApplicationModel.competition_id == competition_id)

        result = db.execute(query).all()

        grouped_result = []
        current_age_category = None
        current_age_group = None
        current_weight_category = None
        current_weight_group = None

        for row in result:
            # Если новая возрастная категория
            if row.age_category != current_age_category:
                # Сохраняем предыдущую весовую группу, если есть
                if current_weight_group:
                    current_age_group["weight_categories"].append(current_weight_group)

                # Сохраняем предыдущую возрастную группу, если есть
                if current_age_group:
                    grouped_result.append(current_age_group)

                # Создаем новую возрастную группу
                current_age_group = {
                    "age_category": row.age_category,
                    "weight_categories": []
                }
                current_age_category = row.age_category

                # Сбрасываем весовые переменные для новой возрастной категории
                current_weight_category = None
                current_weight_group = None

            # Если новая весовая категория внутри текущей возрастной
            if row.weight_category != current_weight_category:
                # Сохраняем предыдущую весовую группу
                if current_weight_group:
                    current_age_group["weight_categories"].append(current_weight_group)

                # Создаем новую весовую группу
                current_weight_group = {
                    "weight_category": row.weight_category,
                    "participants": []
                }
                current_weight_category = row.weight_category

            # Добавляем участника в текущую весовую группу
            current_weight_group["participants"].append({
                "surname": row.surname,
                "name": row.name,
                "rank": row.rank,
                "team": row.team
            })

        # Сохраняем последнюю весовую группу
        if current_weight_group:
            current_age_group["weight_categories"].append(current_weight_group)

        # Сохраняем последнюю возрастную группу
        if current_age_group:
            grouped_result.append(current_age_group)

        return grouped_result

