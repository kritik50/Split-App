# 📄 PROJECT_SUMMARY.md

## What This Project Does
The **Split App (Expense Calculator)** is a full-stack web application designed to solve a very common real-world problem: tracking shared expenses and calculating exactly who owes whom. Imagine going on a trip with friends or living with roommates; instead of passing around a spreadsheet and doing complex math, everyone logs their expenses into the app. The app automatically splits the bills (equally, by percentage, or by exact amounts) and uses a smart algorithm to simplify the total debts.

**Real-world Use Case:** You and three friends go on a trip. You pay $100 for dinner, friend A pays $50 for gas, and friend B pays $200 for the hotel. Who pays who at the end? This app calculates the net balances and tells you the absolute easiest way to settle up (e.g., "Friend C pays you $25").

## Core Features
1. **Secure Authentication:** JWT-based user login and registration.
2. **Group Management:** Users can create groups and add members via email.
3. **Expense Splitting Engine:** Users can add expenses and split them multiple ways.
4. **Smart Debt Simplification:** The app uses a greedy algorithm to minimize the number of transactions needed to settle debts.
5. **Background Processing:** Time-consuming tasks (like notifications and recalculating settlements) run in the background.

## High-Level Architecture
This is a standard **Client-Server Architecture**:
*   **The Client (Frontend):** A React.js Single Page Application (SPA) that provides the user interface. It holds the "state" of the user's session and makes HTTP requests to the backend.
*   **The Server (Backend):** A FastAPI (Python) server that handles all the heavy lifting, business logic, math, and security.
*   **The Database:** A relational database (SQLite locally, scalable to PostgreSQL) managed via SQLAlchemy ORM.

## How All Parts Connect
1.  **User Action:** The user clicks "Add Expense" on the React frontend.
2.  **API Call:** React sends an HTTP POST request (via Axios) containing the expense data and the user's JWT token to the FastAPI backend.
3.  **Backend Processing:** 
    *   FastAPI verifies the JWT token.
    *   The API route passes the data to the **Service Layer** (`ExpenseService`).
    *   The Service Layer calculates the exact mathematical splits (handling penny rounding).
    *   The Service Layer saves the Expense, the Splits, and updates the Balances in the Database.
    *   A Background Task is triggered to handle asynchronous settlements.
4.  **Response:** The backend returns a `200 OK` success message.
5.  **UI Update:** React receives the success message, closes the "Add Expense" modal, and fetches the updated group balances to display on the screen.

---
*Think of it like a restaurant:*
*   **Frontend:** The Waiter (takes your order and shows you the menu).
*   **API:** The Order Ticket (the standardized way the waiter talks to the kitchen).
*   **Backend:** The Kitchen/Chef (does the actual cooking/math).
*   **Database:** The Pantry (where all the ingredients/data are securely stored).
