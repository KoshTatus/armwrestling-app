from sqlalchemy import select, case
from sqlalchemy.orm import Session

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
        """Получение результатов соревнований с группировкой по категориям и расчетом очков"""

        # Словарь для перевода места в очки
        place_points = {
            1: 25, 2: 17, 3: 9, 4: 5, 5: 3, 6: 2
        }

        # CASE выражение для конвертации места в очки
        left_points_case = case(
            *[(ResultModel.left_hand_place == place, points) for place, points in place_points.items()],
            else_=0
        )

        right_points_case = case(
            *[(ResultModel.right_hand_place == place, points) for place, points in place_points.items()],
            else_=0
        )

        # Основной запрос
        query = (
            select(
                AgeCategoryModel.name.label("age_category"),
                WeightCategoryModel.name.label("weight_category"),
                AgeCategoryModel.id.label("age_category_id"),
                WeightCategoryModel.id.label("weight_category_id"),
                ApplicationModel.id.label("application_id"),
                UserModel.surname,
                UserModel.name,
                UserModel.patronymic,
                UserModel.gender,
                UserModel.birth_date,
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
            .join(UserModel, ApplicationModel.user_id == UserModel.id)
            .join(WeightCategoryModel, ApplicationModel.weight_category_id == WeightCategoryModel.id)
            .join(AgeCategoryModel, ApplicationModel.age_category_id == AgeCategoryModel.id)
            .join(RankModel, ApplicationModel.rank_id == RankModel.id)
            .join(ResultModel, ApplicationModel.id == ResultModel.participant_id)
            .where(ApplicationModel.competition_id == competition_id)
            .where(ApplicationModel.status == "APPROVED")
            .order_by(
                AgeCategoryModel.id,
                WeightCategoryModel.id,
                (left_points_case + right_points_case).desc(),  # Сначала по убыванию очков
                ApplicationModel.weight.asc()  # Затем по возрастанию веса (кто легче - выше место)
            )
        )

        result = db.execute(query).all()

        # Группировка результатов
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
                place_counter = 1

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
                place_counter = 1  # Сбрасываем счетчик мест для новой весовой категории
            else:
                # Проверяем, нужно ли увеличить счетчик места
                # Если у предыдущего участника такие же очки и вес, то место не меняется
                if current_weight_group["participants"]:
                    prev_participant = current_weight_group["participants"][-1]
                    if (prev_participant["total_points"] == row.total_points and
                        prev_participant["athlete_weight"] == row.athlete_weight):
                        # То же место, счетчик не увеличиваем
                        pass
                    else:
                        place_counter += 1
                else:
                    # Первый участник в группе
                    pass

            # Формируем ФИО
            full_name = f"{row.surname} {row.name}"
            if row.patronymic:
                full_name += f" {row.patronymic}"

            # Добавляем участника в текущую весовую группу
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

        # Сохраняем последнюю весовую группу
        if current_weight_group:
            current_age_group["weight_categories"].append(current_weight_group)

        # Сохраняем последнюю возрастную группу
        if current_age_group:
            grouped_result.append(current_age_group)

        return grouped_result

    @staticmethod
    def calculate_points(place: int) -> int:
        """Расчет очков в зависимости от занятого места"""
        points_map = {1: 25, 2: 17, 3: 9, 4: 5, 5: 3, 6: 2}
        return points_map.get(place, 0)