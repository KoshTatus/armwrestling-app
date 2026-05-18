from fastapi import FastAPI, HTTPException, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum
import uuid


# Модели для API
class MatchChoice(BaseModel):
    match_id: str
    winner_name: str


class CreateTournamentRequest(BaseModel):
    participant_names: List[str]


class TournamentStatus(BaseModel):
    tournament_id: str
    status: str  # "active", "finished"
    current_round: int
    winners_bracket: List[Dict[str, Any]]
    losers_bracket: List[Dict[str, Any]]
    waiting_for_choice: Optional[Dict[str, Any]] = None
    champion: Optional[str] = None


class MatchInfo(BaseModel):
    match_id: str
    first_participant: Optional[str]
    second_participant: Optional[str]
    round_num: int
    bracket: str
    is_bye: bool


# Оригинальные классы
@dataclass
class Participant:
    name: str
    wins: int = 0
    losses: int = 0
    eliminated: bool = False

    def add_loss(self):
        self.losses += 1
        if self.losses >= 2:
            self.eliminated = True

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "wins": self.wins,
            "losses": self.losses,
            "eliminated": self.eliminated
        }


@dataclass
class Match:
    id: str
    first_participant: Optional[Participant]
    second_participant: Optional[Participant]
    winner: Optional[Participant] = None
    loser: Optional[Participant] = None
    round_num: int = 0
    bracket: str = "winners"
    is_completed: bool = False

    def is_bye(self) -> bool:
        return self.first_participant is None or self.second_participant is None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "first_participant": self.first_participant.name if self.first_participant else None,
            "second_participant": self.second_participant.name if self.second_participant else None,
            "winner": self.winner.name if self.winner else None,
            "loser": self.loser.name if self.loser else None,
            "round_num": self.round_num,
            "bracket": self.bracket,
            "is_bye": self.is_bye(),
            "is_completed": self.is_completed
        }


class TournamentManager:
    def __init__(self, tournament_id: str, participants: List[Participant]):
        self.tournament_id = tournament_id
        self.original_participants = participants.copy()
        self.current_round = 1
        self.winners_participants = [p for p in participants if not p.eliminated]
        self.losers_participants = []
        self.current_matches: List[Match] = []
        self.waiting_for_choice: Optional[Match] = None
        self.champion: Optional[Participant] = None
        self.is_finished = False

    def create_matches(self, participant_list: List[Optional[Participant]], bracket: str, round_num: int) -> List[
        Match]:
        """Создает пары для матчей из списка участников"""
        matches = []
        filtered = [p for p in participant_list if p and not p.eliminated]

        if len(filtered) % 2 != 0:
            filtered.append(None)

        for i in range(0, len(filtered), 2):
            match = Match(
                id=str(uuid.uuid4()),
                first_participant=filtered[i],
                second_participant=filtered[i + 1] if i + 1 < len(filtered) else None,
                round_num=round_num,
                bracket=bracket
            )
            matches.append(match)

        return matches

    def process_match_result(self, match: Match, winner_name: str) -> Dict[str, Any]:
        """Обрабатывает результат матча"""
        if match.is_completed:
            raise HTTPException(status_code=400, detail="Матч уже завершен")

        # Находим победителя
        winner = None
        if match.first_participant and match.first_participant.name == winner_name:
            winner = match.first_participant
            match.loser = match.second_participant
        elif match.second_participant and match.second_participant.name == winner_name:
            winner = match.second_participant
            match.loser = match.first_participant
        else:
            raise HTTPException(status_code=400, detail="Неверное имя победителя")

        if not winner:
            raise HTTPException(status_code=400, detail="Победитель не найден в матче")

        # Обновляем статистику
        match.winner = winner
        match.winner.wins += 1
        if match.loser:
            match.loser.add_loss()

        match.is_completed = True

        return {
            "winner": winner.name,
            "loser": match.loser.name if match.loser else None,
            "eliminated": match.loser.eliminated if match.loser else False
        }

    def advance_round(self) -> Optional[Match]:
        """Продвигает турнир к следующему матчу или раунду"""

        # Проверяем, есть ли незавершенные матчи
        if self.waiting_for_choice:
            return self.waiting_for_choice

        # Проверяем финальные условия
        if len(self.winners_participants) == 1 and len(self.losers_participants) == 1:
            # Гранд-финал
            final_match = Match(
                id=str(uuid.uuid4()),
                first_participant=self.winners_participants[0],
                second_participant=self.losers_participants[0],
                round_num=self.current_round + 1,
                bracket="grand_final"
            )
            self.current_matches = [final_match]
            self.waiting_for_choice = final_match
            return final_match

        if len(self.winners_participants) == 1 and not self.losers_participants:
            self.champion = self.winners_participants[0]
            self.is_finished = True
            return None

        if not self.winners_participants and not self.losers_participants:
            self.is_finished = True
            return None

        # Проводим раунды
        has_matches = False

        # Winners bracket
        if self.winners_participants:
            winners_matches = self.create_matches(self.winners_participants, "winners", self.current_round)
            if winners_matches:
                self.current_matches = winners_matches
                has_matches = True

        # Losers bracket (если нет матчей в winners)
        if not has_matches and self.losers_participants:
            losers_matches = self.create_matches(self.losers_participants, "losers", self.current_round)
            if losers_matches:
                self.current_matches = losers_matches
                has_matches = True

        if not has_matches:
            self.current_round += 1
            return self.advance_round()

        # Находим первый незавершенный матч
        for match in self.current_matches:
            if not match.is_completed:
                if match.is_bye():
                    # Автоматически обрабатываем bye
                    winner = match.first_participant or match.second_participant
                    result = self.process_match_result(match, winner.name)
                    # Рекурсивно продолжаем
                    return self.advance_round()
                else:
                    self.waiting_for_choice = match
                    return match

        # Все матчи завершены, обрабатываем результаты
        new_winners = []
        new_losers = []

        for match in self.current_matches:
            if match.winner:
                new_winners.append(match.winner)
            if match.loser and not match.loser.eliminated:
                new_losers.append(match.loser)

        if self.current_matches and self.current_matches[0].bracket == "winners":
            self.winners_participants = new_winners
            self.losers_participants.extend(new_losers)
        elif self.current_matches and self.current_matches[0].bracket == "losers":
            self.losers_participants = new_losers

        self.current_matches = []
        self.waiting_for_choice = None
        self.current_round += 1

        return self.advance_round()

    def get_status(self) -> Dict[str, Any]:
        """Возвращает текущий статус турнира"""
        waiting_match = None
        if self.waiting_for_choice:
            waiting_match = self.waiting_for_choice.to_dict()

        return {
            "tournament_id": self.tournament_id,
            "status": "finished" if self.is_finished else "active",
            "current_round": self.current_round,
            "winners_bracket": [p.to_dict() for p in self.winners_participants],
            "losers_bracket": [p.to_dict() for p in self.losers_participants],
            "waiting_for_choice": waiting_match,
            "champion": self.champion.name if self.champion else None,
            "all_participants": [p.to_dict() for p in self.original_participants]
        }

    def set_match_winner(self, match_id: str, winner_name: str) -> Dict[str, Any]:
        """Устанавливает победителя матча"""
        if not self.waiting_for_choice or self.waiting_for_choice.id != match_id:
            raise HTTPException(status_code=400, detail="Этот матч не ожидает выбора победителя")

        result = self.process_match_result(self.waiting_for_choice, winner_name)
        self.waiting_for_choice = None

        # Продвигаем турнир
        next_match = self.advance_round()

        return {
            "match_result": result,
            "next_match": next_match.to_dict() if next_match else None,
            "tournament_finished": self.is_finished,
            "champion": self.champion.name if self.champion else None
        }


# FastAPI приложение
app = FastAPI(title="Tournament API", description="API для управления турниром по двойному выбыванию")

# Хранилище турниров
tournaments: Dict[str, TournamentManager] = {}


@app.post("/tournaments", response_model=Dict[str, str])
async def create_tournament(request: CreateTournamentRequest):
    """Создает новый турнир"""
    if len(request.participant_names) < 2:
        raise HTTPException(status_code=400, detail="Минимум 2 участника")

    tournament_id = str(uuid.uuid4())
    participants = [Participant(name) for name in request.participant_names]

    tournament = TournamentManager(tournament_id, participants)
    tournaments[tournament_id] = tournament

    # Запускаем турнир
    tournament.advance_round()

    return {"tournament_id": tournament_id}


@app.get("/tournaments/{tournament_id}/status", response_model=Dict[str, Any])
async def get_tournament_status(tournament_id: str):
    """Получает статус турнира"""
    if tournament_id not in tournaments:
        raise HTTPException(status_code=404, detail="Турнир не найден")

    return tournaments[tournament_id].get_status()


@app.post("/tournaments/{tournament_id}/matches/{match_id}/winner")
async def select_winner(tournament_id: str, match_id: str, choice: MatchChoice):
    """Выбирает победителя матча"""
    if tournament_id not in tournaments:
        raise HTTPException(status_code=404, detail="Турнир не найден")

    tournament = tournaments[tournament_id]

    if tournament.is_finished:
        raise HTTPException(status_code=400, detail="Турнир уже завершен")

    result = tournament.set_match_winner(match_id, choice.winner_name)
    return result


@app.get("/tournaments/{tournament_id}/current-match")
async def get_current_match(tournament_id: str):
    """Получает текущий матч, ожидающий выбора победителя"""
    if tournament_id not in tournaments:
        raise HTTPException(status_code=404, detail="Турнир не найден")

    tournament = tournaments[tournament_id]

    if tournament.is_finished:
        return {"message": "Турнир завершен", "champion": tournament.champion.name if tournament.champion else None}

    if tournament.waiting_for_choice:
        return tournament.waiting_for_choice.to_dict()
    else:
        return {"message": "Нет активных матчей, ожидающих выбора"}


@app.delete("/tournaments/{tournament_id}")
async def delete_tournament(tournament_id: str):
    """Удаляет турнир"""
    if tournament_id not in tournaments:
        raise HTTPException(status_code=404, detail="Турнир не найден")

    del tournaments[tournament_id]
    return {"message": "Турнир удален"}


# Пример использования в документации
if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, port=8000)