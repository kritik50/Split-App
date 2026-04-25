@echo off
echo Starting Split Backend...
start cmd /k "cd backend && python -m uvicorn app.main:app --port 8000 --reload"

echo Starting Split Frontend...
start cmd /k "cd frontend && npm run dev"

echo Both servers started!
