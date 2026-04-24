# 💸 Split App (Expense Calculator)

[![Live Demo](https://img.shields.io/badge/Live_Demo-Available_Here-success?style=for-the-badge)](https://your-live-app-url.com)
*(Note: Replace `https://your-live-app-url.com` with your actual deployed URL)*

A production-ready, highly scalable expense splitting application designed to seamlessly manage group finances. Built with a robust **FastAPI** backend and a premium **Apple-inspired Glassmorphism** React frontend, it features advanced debt simplification algorithms, background processing, and bulletproof financial edge-case handling.

## ✨ Key Features

*   **🧠 Smart Debt Simplification:** Uses a Greedy algorithm to calculate net balances and minimize the total number of transactions required to settle group debts.
*   **⚡ Async Processing:** Utilizes FastAPI's native `BackgroundTasks` for instantaneous API responses while settlements and notifications are processed asynchronously.
*   **🛡️ Financial Integrity:** Mathematically handles edge cases such as exact penny rounding discrepancies and strict split validation.
*   **🔒 Secure Group Management:** Validates balances before allowing members to leave groups, preventing unpaid debts from being orphaned.
*   **🎨 Premium UI/UX:** Built from scratch with an Apple-inspired dark mode, frosted glass containers (`backdrop-filter`), smooth micro-animations, and modern typography (Inter).

## 🛠️ Technology Stack

**Frontend:**
*   React + Vite
*   Vanilla CSS (Custom Design System, Zero framework bloat)
*   React Router DOM

**Backend:**
*   FastAPI (Python)
*   SQLAlchemy (ORM)
*   SQLite (Local Dev) / PostgreSQL (Production Ready via Docker)
*   Pytest (Automated Testing)

## 🚀 Getting Started (Local Development)

### Prerequisites
*   Node.js (v18+)
*   Python (3.10+)

### 1. Backend Setup
Navigate to the backend folder and set up your virtual environment:
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the API Server
uvicorn app.main:app --reload
```
The backend will be running at `http://127.0.0.1:8000`.

### 2. Frontend Setup
Open a new terminal and navigate to the frontend folder:
```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```
The frontend will be running at `http://localhost:5173`.

## 🧪 Testing

The application includes automated unit tests to guarantee the accuracy of financial calculations. To run the tests:
```bash
cd backend
pytest app/tests/
```

## 🐳 Docker (Optional PostgreSQL Setup)

A `docker-compose.yml` is included to quickly spin up a local PostgreSQL database and Redis (for future advanced Celery workflows). 
```bash
docker-compose up -d
```
*(Ensure you update the `DATABASE_URL` in your backend `.env` file to point to the Postgres container).*

---
Designed & Engineered with ❤️ by [Your Name / KP].
