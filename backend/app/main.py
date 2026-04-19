from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import test
from database import Base, engine
from app.models import user  # important (we'll create next)
from app.routes import auth
from app.routes import group
from app.routes import expense
from app.routes import settlement
from app.routes import user as user_router   # ✅ NEW: register user routes
from app.routes import sidebar as sidebar_router  # ✅ sidebar

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(test.router)
app.include_router(auth.router)
app.include_router(group.router)
app.include_router(expense.router)
app.include_router(settlement.router)
app.include_router(user_router.router)  # ✅ NEW
app.include_router(sidebar_router.router)  # ✅ sidebar

Base.metadata.create_all(bind=engine)

@app.get("/")
def home():
    return {"message": "Backend is running 🚀"}