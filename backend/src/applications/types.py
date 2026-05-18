import enum

class StatusCode(int, enum.Enum):
    PENDING = 0
    APPROVED = 1
    REJECTED = 2