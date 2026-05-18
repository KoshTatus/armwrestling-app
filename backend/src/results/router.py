import os
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from starlette.responses import FileResponse

from src.auth.repository import UserRepository
from src.competitions.models import CompetitionModel
from src.results.service import WordExporter
from src.database.db import get_db
from src.results.repository import ResultsRepository

router = APIRouter(
    prefix="/results",
    tags=["results"],
)

@router.get("/{competition_id}")
def get_results(competition_id: int, db: Session = Depends(get_db)):
    results = ResultsRepository.get_results_for_competition(competition_id, db)
    return {
        "data": results
    }

@router.get("/{competition_id}/export")
def export_protocol_to_word(
        competition_id: int,
        db: Session = Depends(get_db)
):
    """Экспорт протокола соревнований в Word документ"""
    try:
        results = ResultsRepository.get_results_for_competition(
            competition_id=competition_id,
            db=db
        )
        if not results:
            raise HTTPException(status_code=404, detail="Результаты не найдены")

        competition = db.query(CompetitionModel).filter(
            CompetitionModel.id == competition_id
        ).first()
        if not competition:
            raise HTTPException(status_code=404, detail="Соревнование не найдено")

        organizer = UserRepository.find_one_or_none_by_id(competition.organizer_id, db)
        organizer_name = f"{organizer.surname} {organizer.name}" if organizer else 'не указан'
        if organizer and organizer.patronymic:
            organizer_name += f" {organizer.patronymic}"

        # Подсчёт статистики участников
        total_participants = 0
        male_count = 0
        female_count = 0
        for age_group in results:
            for weight_group in age_group["weight_categories"]:
                for participant in weight_group["participants"]:
                    total_participants += 1
                    gender = participant.get("gender")
                    if gender == 1:  # MALE
                        male_count += 1
                    elif gender == 2:  # FEMALE
                        female_count += 1

        output_path = WordExporter.export_competition_results_detailed(
            results=results,
            competition_name=competition.title,
            competition_date=competition.date.strftime('%d.%m.%Y') if competition.date else 'не указана',
            competition_location=competition.venue,
            organizer=organizer_name,
            total_participants=total_participants,
            male_count=male_count,
            female_count=female_count
        )

        return FileResponse(
            path=output_path,
            filename=os.path.basename(output_path),
            media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка при экспорте: {str(e)}")