from fastapi import APIRouter

from src.results.router import router as result_router
from src.auth.router import user_router
from src.auth.router import router as auth_router
from src.competitions.router import router as competitions_router
from src.applications.router import router_user_applications as application_router
from src.notifications.router import router as notification_router
from src.files.router import router as files_router
from src.tournament.router import router as tournament_router

router = APIRouter(
    prefix="/api",
    tags=["api"]
)

router.include_router(user_router)
router.include_router(result_router)
router.include_router(auth_router)
router.include_router(competitions_router)
router.include_router(application_router)
router.include_router(notification_router)
router.include_router(files_router)
router.include_router(tournament_router)  # Добавляем турнирный роутер