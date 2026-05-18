# src/bracket/repository.py
from src.bracket.models import BracketModel, MatchModel, ParticipantLossModel
from src.repository import BaseRepository


class BracketRepository(BaseRepository):
    model = BracketModel


class MatchRepository(BaseRepository):
    model = MatchModel


class ParticipantLossRepository(BaseRepository):
    model = ParticipantLossModel