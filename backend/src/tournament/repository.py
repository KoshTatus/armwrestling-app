from src.repository import BaseRepository
from src.tournament.models import MatchModel, TournamentModel


class TournamentMatchRepository(BaseRepository):
    model = MatchModel


class ActiveTournamentRepository(BaseRepository):
    model = TournamentModel