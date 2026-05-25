from dataclasses import dataclass
from typing import Optional, List, Dict, Any
import asyncio
import json
from fastapi import WebSocket
from sqlalchemy.orm import Session

from src.tournament.repository import TournamentMatchRepository
from src.tournament.schemas import TournamentMatchSchema
from src.results.models import ResultModel
from src.tournament.models import TournamentModel


@dataclass
class TournamentParticipant:
    name: str
    application_id: int
    weight: Optional[float] = None
    wins: int = 0
    losses: int = 0
    eliminated: bool = False
    elimination_round: int = 0
    elimination_bracket: str = ""

    def add_loss(self, round_num: int, bracket: str):
        self.losses += 1
        if self.losses >= 2:
            self.eliminated = True
            self.elimination_round = round_num
            self.elimination_bracket = bracket

    def to_dict(self):
        return {
            "name": self.name,
            "wins": self.wins,
            "losses": self.losses,
            "eliminated": self.eliminated,
            "weight": self.weight,
            "application_id": self.application_id,
            "elimination_round": self.elimination_round,
            "elimination_bracket": self.elimination_bracket
        }


@dataclass
class Match:
    first_participant: Optional[TournamentParticipant]
    second_participant: Optional[TournamentParticipant]
    winner: Optional[TournamentParticipant] = None
    loser: Optional[TournamentParticipant] = None
    round_num: int = 0
    bracket: str = "winners"
    match_id: str = ""
    match_number: int = 0

    def is_bye(self) -> bool:
        return self.first_participant is None or self.second_participant is None

    def to_dict(self):
        return {
            "match_id": self.match_id,
            "first_participant": self.first_participant.name if self.first_participant else None,
            "second_participant": self.second_participant.name if self.second_participant else None,
            "winner": self.winner.name if self.winner else None,
            "loser": self.loser.name if self.loser else None,
            "round_num": self.round_num,
            "bracket": self.bracket,
            "is_bye": self.is_bye(),
            "match_number": self.match_number
        }


class Tournament:
    def __init__(self, participants: List[TournamentParticipant], db: Session, competition_id: int,
                 tournament_id: str, hand: str, age_category_id: int, weight_category_id: int):
        self.original_participants = participants.copy()
        self.current_round = 1
        self.waiting_for_choice = False
        self.current_match: Optional[Match] = None
        self.pending_choice: Optional[asyncio.Future] = None
        self.websocket: Optional[WebSocket] = None
        self.db = db
        self.competition_id = competition_id
        self.tournament_id = tournament_id
        self.hand = hand
        self.age_category_id = age_category_id
        self.weight_category_id = weight_category_id
        self.match_counter = 0
        self.is_finished = False          # добавлено
        self._task: Optional[asyncio.Task] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "competition_id": self.competition_id,
            "tournament_id": self.tournament_id,
            "hand": self.hand,
            "age_category_id": self.age_category_id,
            "weight_category_id": self.weight_category_id,
            "current_round": self.current_round,
            "match_counter": self.match_counter,
            "is_finished": self.is_finished,
            "waiting_for_choice": self.waiting_for_choice,
            "original_participants": [p.to_dict() for p in self.original_participants],
            "current_match": self.current_match.to_dict() if self.current_match else None,
        }

    @classmethod
    async def from_dict(cls, data: Dict[str, Any], db: Session) -> "Tournament":
        participants = [
            TournamentParticipant(
                name=p["name"],
                application_id=p["application_id"],
                weight=p.get("weight"),
                wins=p["wins"],
                losses=p["losses"],
                eliminated=p["eliminated"],
                elimination_round=p.get("elimination_round", 0),
                elimination_bracket=p.get("elimination_bracket", "")
            )
            for p in data["original_participants"]
        ]
        tournament = cls(
            participants=participants,
            db=db,
            competition_id=data["competition_id"],
            tournament_id=data["tournament_id"],
            hand=data["hand"],
            age_category_id=data["age_category_id"],
            weight_category_id=data["weight_category_id"]
        )
        tournament.current_round = data["current_round"]
        tournament.match_counter = data["match_counter"]
        tournament.is_finished = data["is_finished"]
        tournament.waiting_for_choice = data["waiting_for_choice"]
        if data.get("current_match"):
            match_data = data["current_match"]
            first = next((p for p in participants if p.name == match_data["first_participant"]), None)
            second = next((p for p in participants if p.name == match_data["second_participant"]), None)
            tournament.current_match = Match(
                first_participant=first,
                second_participant=second,
                round_num=match_data["round_num"],
                bracket=match_data["bracket"],
                match_id=match_data["match_id"],
                match_number=match_data["match_number"]
            )
        return tournament

    async def save_state_to_db(self, db: Session):
        state_dict = self.to_dict()
        active = db.query(TournamentModel).filter(
            TournamentModel.tournament_id == self.tournament_id
        ).first()
        if active:
            active.state_json = json.dumps(state_dict, ensure_ascii=False)
            active.is_active = True
            db.commit()

    async def restore_state_from_db(self, db: Session):
        active = db.query(TournamentModel).filter(
            TournamentModel.tournament_id == self.tournament_id
        ).first()
        if active and active.state_json:
            state = json.loads(active.state_json)
            for i, p in enumerate(self.original_participants):
                saved = next((s for s in state["original_participants"] if s["application_id"] == p.application_id), None)
                if saved:
                    p.wins = saved["wins"]
                    p.losses = saved["losses"]
                    p.eliminated = saved["eliminated"]
                    p.elimination_round = saved.get("elimination_round", 0)
                    p.elimination_bracket = saved.get("elimination_bracket", "")
            self.current_round = state["current_round"]
            self.match_counter = state["match_counter"]
            self.is_finished = state["is_finished"]
            self.waiting_for_choice = state["waiting_for_choice"]
            if state.get("current_match"):
                match_data = state["current_match"]
                first = next((p for p in self.original_participants if p.name == match_data["first_participant"]), None)
                second = next((p for p in self.original_participants if p.name == match_data["second_participant"]), None)
                self.current_match = Match(
                    first_participant=first,
                    second_participant=second,
                    round_num=match_data["round_num"],
                    bracket=match_data["bracket"],
                    match_id=match_data["match_id"],
                    match_number=match_data["match_number"]
                )
            if self.waiting_for_choice and self.current_match:
                self.pending_choice = asyncio.Future()

    def _create_matches(self, participant_list: List[Optional[TournamentParticipant]], bracket: str, round_num: int,
                        start_id: int) -> tuple[List[Match], int]:
        matches = []
        filtered = [p for p in participant_list if p and not p.eliminated]
        if len(filtered) % 2 != 0:
            filtered.append(None)
        for i in range(0, len(filtered), 2):
            self.match_counter += 1
            match = Match(
                first_participant=filtered[i],
                second_participant=filtered[i + 1] if i + 1 < len(filtered) else None,
                round_num=round_num,
                bracket=bracket,
                match_id=f"{bracket}_{round_num}_{i//2}",
                match_number=self.match_counter
            )
            matches.append(match)
        return matches, start_id + len(matches)

    async def _ask_winner(self, match: Match) -> Optional[TournamentParticipant]:
        self.current_match = match
        self.waiting_for_choice = True
        if self.websocket:
            await self.websocket.send_json({
                "type": "match",
                "data": match.to_dict()
            })
        self.pending_choice = asyncio.Future()
        winner = await self.pending_choice
        self.waiting_for_choice = False
        self.current_match = None
        return winner

    async def _save_match_result(self, match: Match):
        try:
            match_data = TournamentMatchSchema(
                competition_id=self.competition_id,
                tournament_id=self.tournament_id,
                hand=self.hand,
                age_category_id=self.age_category_id,
                weight_category_id=self.weight_category_id,
                round_num=match.round_num,
                bracket=match.bracket,
                match_number=match.match_number,
                first_participant_name=match.first_participant.name if match.first_participant else "",
                second_participant_name=match.second_participant.name if match.second_participant else None,
                winner_name=match.winner.name if match.winner else None,
                loser_name=match.loser.name if match.loser else None,
                is_bye=match.is_bye()
            )
            TournamentMatchRepository.add(self.db, **match_data.model_dump())
            await self._send_log(f"  [Сохранено] Матч #{match.match_number} ({match.bracket})")
        except Exception as e:
            await self._send_log(f"  [Ошибка сохранения] {str(e)}")

    async def _simulate_match(self, match: Match) -> None:
        if match.is_bye():
            match.winner = match.first_participant or match.second_participant
            match.loser = None
            await self._save_match_result(match)
            return
        winner = await self._ask_winner(match)
        if winner == match.first_participant:
            match.winner = match.first_participant
            match.loser = match.second_participant
        else:
            match.winner = match.second_participant
            match.loser = match.first_participant
        match.winner.wins += 1
        if match.loser:
            match.loser.add_loss(match.round_num, match.bracket)
        await self._save_match_result(match)

    async def _send_log(self, message: str):
        if self.websocket:
            try:
                await self.websocket.send_json({"type": "log", "data": message})
            except:
                pass

    async def _send_match_result(self, match: Match):
        if match.is_bye():
            await self._send_log(f"  BYE: {match.winner.name} автоматически проходит дальше")
        else:
            await self._send_log(f"  {match.winner.name} победил {match.loser.name}")

    async def _send_status_update(self):
        if self.websocket:
            status = {
                "type": "status",
                "data": {
                    "winners": [p.to_dict() for p in self.original_participants if not p.eliminated and p.losses == 0],
                    "losers": [p.to_dict() for p in self.original_participants if not p.eliminated and p.losses == 1],
                    "eliminated": [p.to_dict() for p in self.original_participants if p.eliminated],
                    "current_round": self.current_round
                }
            }
            await self.websocket.send_json(status)

    async def _run_round_matches(self, matches: List[Match], bracket_name: str) -> tuple[List[TournamentParticipant], List[TournamentParticipant]]:
        winners = []
        losers = []
        await self._send_log(f"\n{'='*60}")
        await self._send_log(f"РАУНД {self.current_round} - {bracket_name}")
        await self._send_log(f"{'='*60}")
        for i, match in enumerate(matches, 1):
            await self._send_log(f"\n--- Матч {i} из {len(matches)} ---")
            await self._simulate_match(match)
            await self._send_match_result(match)
            if match.winner:
                winners.append(match.winner)
            if match.loser and not match.loser.eliminated:
                losers.append(match.loser)
            await self._send_status_update()
            await self.save_state_to_db(self.db)   # сохраняем после каждого матча
        return winners, losers

    async def run_tournament(self, websocket: WebSocket):
        self.websocket = websocket
        await self._send_log("\n" + "="*60)
        await self._send_log("ТУРНИР С ДВОЙНЫМ ВЫБЫВАНИЕМ (Double Elimination)")
        await self._send_log("="*60)
        await self._send_log("ПРАВИЛА: Участник выбывает после двух поражений")

        winners_pool = [p for p in self.original_participants if not p.eliminated]
        losers_pool = []
        round_num = 1

        while True:
            self.current_round = round_num
            winners_matches_played = False
            losers_matches_played = False

            if winners_pool:
                winners_matches, _ = self._create_matches(winners_pool, "winners", round_num, 0)
                if winners_matches:
                    new_winners, losers_from_winners = await self._run_round_matches(winners_matches, "СЕТКА ПОБЕДИТЕЛЕЙ")
                    winners_pool = new_winners
                    losers_pool.extend(losers_from_winners)
                    winners_matches_played = True

            if losers_pool:
                losers_matches, _ = self._create_matches(losers_pool, "losers", round_num, 0)
                if losers_matches:
                    new_losers, eliminated = await self._run_round_matches(losers_matches, "СЕТКА ПРОИГРАВШИХ")
                    losers_pool = new_losers
                    losers_matches_played = True

            if winners_matches_played or losers_matches_played:
                await self._send_log(f"\n--- СТАТУС ПОСЛЕ РАУНДА {round_num} ---")
                if winners_pool:
                    await self._send_log(f"  Winners: {', '.join(p.name for p in winners_pool)}")
                else:
                    await self._send_log("  Winners: пусто")
                if losers_pool:
                    await self._send_log(f"  Losers: {', '.join(p.name for p in losers_pool)}")
                else:
                    await self._send_log("  Losers: пусто")

            if len(winners_pool) == 1 and len(losers_pool) == 1:
                await self._send_log(f"\n{'🔥'*60}")
                await self._send_log("ГРАНД-ФИНАЛ!")
                await self._send_log(f"Чемпион winners: {winners_pool[0].name} (0 поражений)")
                await self._send_log(f"Чемпион losers: {losers_pool[0].name} (1 поражение)")
                await self._send_log(f"{'🔥'*60}")

                self.match_counter += 1
                final_match = Match(
                    first_participant=winners_pool[0],
                    second_participant=losers_pool[0],
                    round_num=round_num+1,
                    bracket="grand_final",
                    match_id="grand_final_1",
                    match_number=self.match_counter
                )
                await self._send_log(f"\n--- ГРАНД-ФИНАЛ, МАТЧ 1 ---")
                await self._simulate_match(final_match)
                await self._send_match_result(final_match)
                champion = final_match.winner

                if final_match.winner == losers_pool[0]:
                    await self._send_log(f"\n{'⚠️'*60}")
                    await self._send_log("Победитель из losers выиграл первый финал! Нужен решающий матч.")
                    await self._send_log(f"{'⚠️'*60}")
                    self.match_counter += 1
                    final_match2 = Match(
                        first_participant=winners_pool[0],
                        second_participant=losers_pool[0],
                        round_num=round_num+1,
                        bracket="grand_final",
                        match_id="grand_final_2",
                        match_number=self.match_counter
                    )
                    await self._send_log(f"\n--- ГРАНД-ФИНАЛ, МАТЧ 2 ---")
                    await self._simulate_match(final_match2)
                    await self._send_match_result(final_match2)
                    champion = final_match2.winner

                await self._send_log(f"\n{'🏆'*60}")
                await self._send_log(f"ЧЕМПИОН ТУРНИРА: {champion.name}")
                await self._send_log(f"{'🏆'*60}")
                await self._show_final_stats()
                self.is_finished = True
                await self.save_state_to_db(self.db)
                if self.websocket:
                    await self.websocket.send_json({
                        "type": "tournament_finished",
                        "data": {"champion": champion.name, "hand": self.hand}
                    })
                return {"champion": champion.name, "stats": [p.to_dict() for p in self.original_participants]}

            if len(winners_pool) == 1 and not losers_pool:
                champion = winners_pool[0]
                await self._send_log(f"\n{'🏆'*60}")
                await self._send_log(f"ЧЕМПИОН ТУРНИРА: {champion.name} (НЕПОБЕЖДЁННЫЙ!)")
                await self._send_log(f"{'🏆'*60}")
                await self._show_final_stats()
                self.is_finished = True
                await self.save_state_to_db(self.db)
                if self.websocket:
                    await self.websocket.send_json({
                        "type": "tournament_finished",
                        "data": {"champion": champion.name, "hand": self.hand}
                    })
                return {"champion": champion.name, "stats": [p.to_dict() for p in self.original_participants]}

            if not winners_pool and not losers_pool:
                await self._send_log("\nТурнир завершён без чемпиона?")
                self.is_finished = True
                await self.save_state_to_db(self.db)
                break

            round_num += 1

        return {"champion": None, "stats": [p.to_dict() for p in self.original_participants]}

    async def _show_final_stats(self):
        await self._send_log("\n" + "="*60)
        await self._send_log("ИТОГОВАЯ СТАТИСТИКА ВСЕХ УЧАСТНИКОВ")
        await self._send_log("="*60)
        for p in self.original_participants:
            status = "ВЫБЫЛ" if p.eliminated else "АКТИВЕН"
            await self._send_log(f"{p.name}: {p.wins} побед, {p.losses} поражений - {status}")

    async def make_choice(self, winner_name: str):
        if self.pending_choice and not self.pending_choice.done():
            winner = next((p for p in self.original_participants if p.name == winner_name), None)
            if winner:
                self.pending_choice.set_result(winner)

    def calculate_placements(self) -> Dict[int, int]:
        def sort_key(p: TournamentParticipant):
            return (
                p.losses,
                -p.elimination_round if p.losses == 1 else 0,
                p.weight if p.weight is not None else 999,
                -p.wins
            )
        sorted_participants = sorted(self.original_participants, key=sort_key)
        placements = {}
        for i, p in enumerate(sorted_participants, 1):
            placements[p.application_id] = i
        return placements

    async def save_results_to_db(self, db: Session) -> dict:
        placements = self.calculate_placements()
        results = {}
        for app_id, place in placements.items():
            existing = db.query(ResultModel).filter(ResultModel.participant_id == app_id).first()
            if self.hand == "left":
                if existing:
                    existing.left_hand_place = place
                else:
                    new = ResultModel(participant_id=app_id, left_hand_place=place, right_hand_place=None)
                    db.add(new)
            else:
                if existing:
                    existing.right_hand_place = place
                else:
                    new = ResultModel(participant_id=app_id, left_hand_place=None, right_hand_place=place)
                    db.add(new)
            results[app_id] = place
        try:
            db.commit()
        except Exception as e:
            db.rollback()
            raise e
        return results