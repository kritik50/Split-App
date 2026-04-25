# 📄 BACKEND_GUIDE.md

## Why FastAPI?
FastAPI is the backbone of this project. As a Senior Engineer, here is why we use it over older frameworks like Flask or Django:
*   **Speed:** It uses asynchronous programming (`async/await`), making it incredibly fast for I/O operations (like reading from a database).
*   **Automatic Validation:** It leverages `Pydantic`. If the frontend accidentally sends a string `"apple"` instead of a number `100` for an expense, FastAPI automatically blocks it and sends a clean `422 Unprocessable Entity` error. You don't write manual `if type(amount) != float` checks.
*   **Auto-Documentation:** It automatically generates interactive API documentation (usually at `/docs`), which is massive for debugging and frontend integration.

---

## Folder Structure (The Controller-Service-Repository Pattern)
We use an enterprise-grade architecture. By splitting code into these specific layers, the app avoids becoming a tangled "monolith" and remains easy to test. 

Here is exactly what every folder in `backend/app/` does, in the order a request travels through them:

### 1. `main.py` (The Front Door)
This is the entry point. It connects to the database, sets up security (CORS), and registers all the "routers" (endpoints). Think of this as the **Receptionist** pointing traffic to the right floors.

### 2. `/dependencies` (The Security Checkpoint)
Before a request is allowed to do anything, it often hits a dependency. 
*   *Role:* When a user tries to delete a group, `auth.py` checks their JWT token, decrypts it, and verifies who they are. If they aren't logged in, it acts like a bouncer and kicks them out with a `401 Unauthorized` error before the main code even runs.

### 3. `/schemas` (The Contract / Pydantic)
Schemas define exactly what JSON data should look like when coming **in** (requests) and going **out** (responses).
*   *Role:* The `ExpenseCreate` schema guarantees that `amount` is a float and `splits` is a list. It is the strict, unbreakable contract between the frontend and backend.

### 4. `/routes` (The Controllers)
Once past security and validation, the request lands here (e.g., `routes/expense.py`).
*   *Role:* The route is the **Traffic Cop**. It receives the clean JSON, but **it does absolutely no math or logic**. It immediately hands the data over to the Services folder.

### 5. `/services` (The Brains)
This is where the actual software engineering happens.
*   *Role:* In `expense_service.py`, this is where we calculate who owes whom, handle the rounding of pennies, enforce business rules (e.g., "You can't leave a group if you have debt"), and trigger background jobs. *This layer does not know anything about HTTP or JSON.*

### 6. `/models` (The Database Schema / SQLAlchemy)
Finally, the Service needs to save the data.
*   *Role:* Models translate Python objects into SQL Database tables. `models/expense.py` represents the exact columns inside your SQLite/PostgreSQL database.

---

## The Complete Flow (Step-by-Step)
Let's trace what happens when a user adds an expense:

1.  **Frontend** sends a JSON POST request.
2.  **`main.py`** catches it and sends it to the `/expenses` **Route**.
3.  The **Dependency** checks the JWT token ("*Is this user logged in?*").
4.  The **Schema** validates the JSON ("*Is the amount actually a number?*").
5.  The **Route** passes the validated, secure data to the **Service**.
6.  The **Service** does the math to perfectly split the bill.
7.  The **Service** uses the **Model** to save the final numbers into the Database.
8.  The **Route** returns a `200 OK` JSON response back to the frontend.

By keeping these folders separate, if you ever decide to change your database, you only touch `models/`. If you want to change how math is calculated, you only touch `services/`. This is exactly how Senior Engineers build scalable software!
