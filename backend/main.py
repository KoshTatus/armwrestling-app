import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.database.db import create_db
from src.router import router
from src.settings import settings
from src.tournament.models import TournamentMatchModel, ActiveTournamentModel

app = FastAPI()

app.include_router(router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[f"http://{settings.frontend_host}:{settings.frontend_port}"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

if __name__ == "__main__":
    create_db()
    uvicorn.run(app, port=5000)


