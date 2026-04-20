import os
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models import user  # important (we'll create next)
from app.routes import auth
from app.routes import expense
from app.routes import group
from app.routes import settlement
from app.routes import sidebar as sidebar_router
from app.routes import test
from app.routes import user as user_router
from database import Base, engine

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None


def load_env_file():
    env_path = Path(__file__).resolve().parents[1] / ".env"
    if load_dotenv is not None:
        load_dotenv(dotenv_path=env_path)
        return

    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


load_env_file()


def get_allowed_origins():
    frontend_urls = os.getenv(
        "FRONTEND_URLS",
        "http://localhost:5173,http://127.0.0.1:5173",
    )
    return [url.strip() for url in frontend_urls.split(",") if url.strip()]


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_allowed_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(test.router)
app.include_router(auth.router)
app.include_router(group.router)
app.include_router(expense.router)
app.include_router(settlement.router)
app.include_router(user_router.router)
app.include_router(sidebar_router.router)

Base.metadata.create_all(bind=engine)


@app.get("/")
def home():
    return {"message": "Backend is running"}
