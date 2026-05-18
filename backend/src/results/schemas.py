from pydantic import BaseModel


class ResultsSchema(BaseModel):
    id: int | None = None
    participant_id: int
    left_hand_place: int
    right_hand_place: int