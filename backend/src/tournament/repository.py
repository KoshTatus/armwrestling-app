from src.repository import BaseRepository
from src.tournament.models import TournamentMatchModel, ActiveTournamentModel


class TournamentMatchRepository(BaseRepository):
    model = TournamentMatchModel


class ActiveTournamentRepository(BaseRepository):
    model = ActiveTournamentModel