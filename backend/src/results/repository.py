from sqlalchemy import select, case
from sqlalchemy.orm import Session

from src.applications.types import StatusCode
from src.applications.models import AgeCategoryModel, WeightCategoryModel, ApplicationModel, RankModel
from src.auth.models import UserModel
from src.results.models import ResultModel
from src.repository import BaseRepository


class ResultsRepository(BaseRepository):
    model = ResultModel

    @staticmethod
    def get_results_for_competition(
            competition_id: int,
            db: Session
    ):
        place_points = {
            1: 25, 2: 17, 3: 9, 4: 5, 5: 3, 6: 2
        }

        left_points_case = case(
            *[(ResultModel.left_hand_place == place, points) for place, points in place_points.items()],
            else_=0
        )
        right_points_case = case(
            *[(ResultModel.right_hand_place == place, points) for place, points in place_points.items()],
            else_=0
        )

        surname_case = case(
            (ApplicationModel.user_id.isnot(None), UserModel.surname),
            else_=ApplicationModel.surname
        ).label("surname")

        name_case = case(
            (ApplicationModel.user_id.isnot(None), UserModel.name),
            else_=ApplicationModel.name
        ).label("name")

        patronymic_case = case(
            (ApplicationModel.user_id.isnot(None), UserModel.patronymic),
            else_=ApplicationModel.patronymic
        ).label("patronymic")

        gender_case = case(
            (ApplicationModel.user_id.isnot(None), UserModel.gender),
            else_=None
        ).label("gender")

        birth_date_case = case(
            (ApplicationModel.user_id.isnot(None), UserModel.birth_date),
            else_=None
        ).label("birth_date")

        query = (
            select(
                AgeCategoryModel.name.label("age_category"),
                WeightCategoryModel.name.label("weight_category"),
                AgeCategoryModel.id.label("age_category_id"),
                WeightCategoryModel.id.label("weight_category_id"),
                ApplicationModel.id.label("application_id"),
                surname_case,
                name_case,
                patronymic_case,
                gender_case,
                birth_date_case,
                RankModel.name.label("rank"),
                ApplicationModel.team,
                ApplicationModel.weight.label("athlete_weight"),
                ResultModel.left_hand_place,
                left_points_case.label("left_points"),
                ResultModel.right_hand_place,
                right_points_case.label("right_points"),
                (left_points_case + right_points_case).label("total_points")
            )
            .select_from(ApplicationModel)
            .outerjoin(UserModel, ApplicationModel.user_id == UserModel.id)
            .join(WeightCategoryModel, ApplicationModel.weight_category_id == WeightCategoryModel.id)
            .join(AgeCategoryModel, ApplicationModel.age_category_id == AgeCategoryModel.id)
            .join(RankModel, ApplicationModel.rank_id == RankModel.id)
            .join(ResultModel, ApplicationModel.id == ResultModel.participant_id)
            .where(ApplicationModel.competition_id == competition_id)
            .where(ApplicationModel.status == StatusCode.APPROVED)
            .order_by(
                AgeCategoryModel.id,
                WeightCategoryModel.id,
                (left_points_case + right_points_case).desc(),
                ApplicationModel.weight.asc()
            )
        )

        result = db.execute(query).all()

        grouped_result = []
        current_age_category = None
        current_age_group = None
        current_weight_category = None
        current_weight_group = None
        place_counter = 1

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
                place_counter = 1

            if row.weight_category != current_weight_category:
                if current_weight_group:
                    current_age_group["weight_categories"].append(current_weight_group)

                current_weight_group = {
                    "weight_category": row.weight_category,
                    "participants": []
                }
                current_weight_category = row.weight_category
                place_counter = 1
            else:
                if current_weight_group["participants"]:
                    prev = current_weight_group["participants"][-1]
                    if not (prev["total_points"] == row.total_points and
                            prev["athlete_weight"] == row.athlete_weight):
                        place_counter += 1
                else:
                    pass

            full_name = f"{row.surname or ''} {row.name or ''}".strip()
            if row.patronymic:
                full_name += f" {row.patronymic}"

            current_weight_group["participants"].append({
                "place_by_two_arms": place_counter,
                "full_name": full_name,
                "gender": row.gender,
                "birth_date": row.birth_date,
                "rank": row.rank,
                "team": row.team,
                "left_hand_place": row.left_hand_place,
                "left_points": row.left_points,
                "right_hand_place": row.right_hand_place,
                "right_points": row.right_points,
                "total_points": row.total_points,
                "athlete_weight": row.athlete_weight
            })

        if current_weight_group:
            current_age_group["weight_categories"].append(current_weight_group)
        if current_age_group:
            grouped_result.append(current_age_group)

        return grouped_result