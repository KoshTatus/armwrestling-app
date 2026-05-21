import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import asyncio

from src.database.db import get_db
from src.applications.models import ApplicationModel
from src.applications.types import StatusCode
from src.auth.models import UserModel
from src.auth.router import check_user_role
from src.auth.schemas import Role
from src.auth.jwt_auth.base.auth import JWTAuth
from src.auth.jwt_auth.base.config import JWTConfig
from src.auth.jwt_auth.utils import try_to_decode_token
from src.tournament.service import Tournament, TournamentParticipant
from src.tournament.schemas import StartTournamentRequest, StartTournamentResponse, TournamentMatchSchema
from src.tournament.repository import TournamentMatchRepository, ActiveTournamentRepository
from src.tournament.models import TournamentModel, MatchModel

router = APIRouter(prefix="/tournament", tags=["tournament"])
active_tournaments = {}
jwt_auth = JWTAuth(config=JWTConfig())


@router.post("/start/{competition_id}", response_model=StartTournamentResponse)
async def start_tournament(
    competition_id: int,
    req: StartTournamentRequest,
    db: Session = Depends(get_db),
    current_user = Depends(check_user_role(Role.ORGANIZER))
):
    # Проверяем в памяти
    for tid, t in active_tournaments.items():
        if (t.competition_id == competition_id and
            t.age_category_id == req.age_category_id and
            t.weight_category_id == req.weight_category_id and
            t.hand == req.hand):
            raise HTTPException(status_code=409, detail=f"Турнир уже существует (ID: {tid})")
    # Проверяем в БД
    existing = db.query(TournamentModel).filter(
        TournamentModel.competition_id == competition_id,
        TournamentModel.age_category_id == req.age_category_id,
        TournamentModel.weight_category_id == req.weight_category_id,
        TournamentModel.hand == req.hand,
        TournamentModel.is_active == True
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"Турнир уже существует (ID: {existing.tournament_id})")

    applications = db.query(ApplicationModel).filter(
        ApplicationModel.competition_id == competition_id,
        ApplicationModel.status == StatusCode.APPROVED,
        ApplicationModel.age_category_id == req.age_category_id,
        ApplicationModel.weight_category_id == req.weight_category_id
    ).all()
    if len(applications) < 2:
        raise HTTPException(status_code=400, detail="Недостаточно участников")
    participants = []
    for app in applications:
        user = db.query(UserModel).filter(UserModel.id == app.user_id).first()
        if user:
            full_name = f"{user.surname} {user.name} {user.patronymic}".strip()
            weight = float(app.weight) if app.weight else None
            participants.append(TournamentParticipant(name=full_name, application_id=app.id, weight=weight))
        else:
            full_name = f"{app.surname} {app.name} {app.patronymic}".strip()
            weight = float(app.weight) if app.weight else None
            participants.append(TournamentParticipant(name=full_name, application_id=app.id, weight=weight))
    if len(participants) < 2:
        raise HTTPException(status_code=400, detail="Не удалось собрать участников")

    tournament_id = f"tournament_{competition_id}_{req.age_category_id}_{req.weight_category_id}_{req.hand}_{len(active_tournaments)+1}"
    tournament = Tournament(participants, db, competition_id, tournament_id, req.hand, req.age_category_id, req.weight_category_id)
    active_tournaments[tournament_id] = tournament

    active_record = TournamentModel(
        tournament_id=tournament_id,
        competition_id=competition_id,
        organizer_id=current_user.id,
        hand=req.hand,
        age_category_id=req.age_category_id,
        weight_category_id=req.weight_category_id,
        participants_data=json.dumps([{"name": p.name, "app_id": p.application_id, "weight": p.weight} for p in participants]),
        is_active=True
    )
    db.add(active_record)
    db.commit()
    await tournament.save_state_to_db(db)
    return StartTournamentResponse(tournament_id=tournament_id)


@router.websocket("/ws/{tournament_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    tournament_id: str,
    token: str = Query(...),
    db: Session = Depends(get_db)
):
    try:
        payload = try_to_decode_token(jwt_auth, token)
        role_id = payload.get("role_id")
        if role_id < 2:
            await websocket.close(code=1008, reason="Forbidden")
            return
    except Exception:
        await websocket.close(code=1008, reason="Invalid token")
        return
    await websocket.accept()

    tournament = active_tournaments.get(tournament_id)
    if tournament is None:
        # Пытаемся восстановить из БД
        active_record = db.query(TournamentModel).filter(
            TournamentModel.tournament_id == tournament_id,
            TournamentModel.is_active == True
        ).first()
        if not active_record:
            await websocket.send_json({"type": "error", "data": "Tournament not found"})
            await websocket.close(code=1008)
            return
        # Восстанавливаем турнир
        participants_data = json.loads(active_record.participants_data)
        participants = [
            TournamentParticipant(name=p["name"], application_id=p["app_id"], weight=p.get("weight"))
            for p in participants_data
        ]
        tournament = Tournament(
            participants=participants,
            db=db,
            competition_id=active_record.competition_id,
            tournament_id=tournament_id,
            hand=active_record.hand,
            age_category_id=active_record.age_category_id,
            weight_category_id=active_record.weight_category_id
        )
        await tournament.restore_state_from_db(db)
        active_tournaments[tournament_id] = tournament

    tournament.websocket = websocket
    if tournament.waiting_for_choice and tournament.current_match:
        tournament.pending_choice = asyncio.Future()
        await websocket.send_json({
            "type": "match",
            "data": tournament.current_match.to_dict()
        })

    try:
        if not hasattr(tournament, "_task") or tournament._task is None or tournament._task.done():
            tournament._task = asyncio.create_task(tournament.run_tournament(websocket))

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            if message["type"] == "choice":
                await tournament.make_choice(message["winner"])
            await tournament.save_state_to_db(db)
    except WebSocketDisconnect:
        await tournament.save_state_to_db(db)
        tournament.websocket = None
        if hasattr(tournament, "_task") and not tournament._task.done():
            tournament._task.cancel()
    except Exception as e:
        print(f"WebSocket error: {e}")
        await tournament.save_state_to_db(db)
    finally:
        pass


@router.get("/matches/{competition_id}")
def get_tournament_matches(
    competition_id: int,
    db: Session = Depends(get_db),
    current_user = Depends(check_user_role(Role.ORGANIZER))
):
    matches = TournamentMatchRepository.find_all(db, competition_id=competition_id)
    return {"data": [TournamentMatchSchema.model_validate(m).model_dump() for m in matches]}


@router.post("/save/{tournament_id}")
async def save_tournament_results(
    tournament_id: str,
    db: Session = Depends(get_db),
    current_user = Depends(check_user_role(Role.ORGANIZER))
):
    if tournament_id not in active_tournaments:
        raise HTTPException(status_code=404, detail="Турнир не найден")
    tournament = active_tournaments[tournament_id]
    if not tournament.is_finished:
        raise HTTPException(status_code=400, detail="Турнир не завершён")
    try:
        results = await tournament.save_results_to_db(db)
        # Деактивируем
        if tournament_id in active_tournaments:
            del active_tournaments[tournament_id]
        active_record = db.query(TournamentModel).filter(TournamentModel.tournament_id == tournament_id).first()
        if active_record:
            active_record.is_active = False
            db.commit()
        return {"message": "Результаты сохранены", "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Ошибка сохранения: {str(e)}")


@router.get("/check/{competition_id}")
def check_active_tournament(
    competition_id: int,
    age_category_id: int,
    weight_category_id: int,
    hand: str,
    db: Session = Depends(get_db),
    # current_user = Depends(check_user_role(Role.ORGANIZER))
):
    active = db.query(TournamentModel).filter(
        TournamentModel.competition_id == competition_id,
        TournamentModel.age_category_id == age_category_id,
        TournamentModel.weight_category_id == weight_category_id,
        TournamentModel.hand == hand,
        TournamentModel.is_active == True
    ).first()
    if active:
        return {"exists": True, "tournament_id": active.tournament_id}
    return {"exists": False}


@router.get("/bracket/{competition_id}")
def get_tournament_bracket(
    competition_id: int,
    age_category_id: int,
    weight_category_id: int,
    hand: str,
    db: Session = Depends(get_db),
):
    # Получаем все матчи
    matches = db.query(MatchModel).filter(
        MatchModel.competition_id == competition_id,
        MatchModel.age_category_id == age_category_id,
        MatchModel.weight_category_id == weight_category_id,
        MatchModel.hand == hand
    ).all()

    # Разделяем
    winners = [m for m in matches if m.bracket == "winners"]
    losers = [m for m in matches if m.bracket == "losers"]
    grand = [m for m in matches if m.bracket == "grand_final"]

    # Группируем winners по раунду
    winners_by_round = {}
    for m in winners:
        winners_by_round.setdefault(m.round_num, []).append(m)

    # Группируем losers по раунду
    losers_by_round = {}
    for m in losers:
        losers_by_round.setdefault(m.round_num, []).append(m)

    # Все уникальные раунды (из winners и losers)
    all_rounds = sorted(set(winners_by_round.keys()) | set(losers_by_round.keys()))
    rounds_data = []
    for r in all_rounds:
        rounds_data.append({
            "round_num": r,
            "winners_matches": [
                {
                    "id": m.id,
                    "first": m.first_participant_name,
                    "second": m.second_participant_name,
                    "winner": m.winner_name,
                    "is_bye": m.is_bye
                } for m in winners_by_round.get(r, [])
            ],
            "losers_matches": [
                {
                    "id": m.id,
                    "first": m.first_participant_name,
                    "second": m.second_participant_name,
                    "winner": m.winner_name,
                    "is_bye": m.is_bye
                } for m in losers_by_round.get(r, [])
            ]
        })

    # Гранд-финал
    grand_final_matches = []
    for m in grand:
        grand_final_matches.append({
            "match_number": m.match_number,
            "first": m.first_participant_name,
            "second": m.second_participant_name,
            "winner": m.winner_name,
            "is_bye": m.is_bye
        })

    return {
        "data": {
            "rounds": rounds_data,
            "grand_final_matches": grand_final_matches
        }
    }
