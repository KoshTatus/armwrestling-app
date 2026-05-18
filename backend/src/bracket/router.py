# src/bracket_double_elimination/router.py
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from src.auth.router import check_user_role
from src.auth.schemas import Role
from src.database.db import get_db
from src.bracket.service import DoubleEliminationService
from src.applications.repository import ApplicationRepository
from src.auth.repository import AuthRepository

router = APIRouter(
    prefix="/tournament",
    tags=["tournament"]
)


class CreateTournamentRequest(BaseModel):
    competition_id: int
    weight_category_id: int


class SetWinnerRequest(BaseModel):
    match_id: int
    winner_participant_id: int


@router.post("/create")
def create_tournament(
        request: CreateTournamentRequest,
        user_role=Depends(check_user_role(Role.ORGANIZER)),
        db: Session = Depends(get_db)
):
    """Создание турнира для весовой категории"""
    # Получаем участников с подтвержденными заявками и сохраненным весом
    applications = ApplicationRepository.find_all(
        db,
        competition_id=request.competition_id,
        weight_category_id=request.weight_category_id,
        status="APPROVED"
    )

    # Фильтруем только тех, у кого есть вес
    participants = []
    for app in applications:
        if app.weight and app.weight > 0:
            user = AuthRepository.find_one_or_none_by_id(app.user_id, db)
            full_name = f"{user.surname} {user.name}"
            if user.patronymic:
                full_name += f" {user.patronymic}"

            participants.append({
                "application_id": app.id,
                "full_name": full_name,
                "weight": app.weight
            })

    if len(participants) < 2:
        raise HTTPException(status_code=400, detail="Недостаточно участников для создания турнира (минимум 2)")

    tournament = DoubleEliminationService.create_tournament(
        db, request.competition_id, request.weight_category_id, participants
    )

    return {
        "data": {
            "tournament_id": tournament.id,
            "state": DoubleEliminationService.get_tournament_state(db, tournament.id)
        }
    }


@router.get("/{tournament_id}/state")
def get_tournament_state(
        tournament_id: int,
        db: Session = Depends(get_db)
):
    """Получение состояния турнира"""
    try:
        state = DoubleEliminationService.get_tournament_state(db, tournament_id)
        return {"data": state}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{tournament_id}/matches")
def get_tournament_matches(
        tournament_id: int,
        db: Session = Depends(get_db)
):
    """Получение текущих матчей"""
    try:
        matches = DoubleEliminationService.get_current_matches(db, tournament_id)
        return {"data": matches}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{tournament_id}/winner")
def set_match_winner(
        tournament_id: int,
        request: SetWinnerRequest,
        user_role=Depends(check_user_role(Role.ORGANIZER)),
        db: Session = Depends(get_db)
):
    """Установка победителя матча"""
    try:
        state = DoubleEliminationService.set_match_winner(
            db, tournament_id, request.match_id, request.winner_participant_id
        )
        return {"data": state}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))