# 📄 PRACTICAL_KNOWLEDGE.md

Working through this codebase teaches several highly practical, real-world engineering concepts that you will use in almost every professional tech job.

## 1. The Reality of State Management
In tutorials, you often see Redux used for everything. In this project, you see **Context API**.
*   **The Lesson:** You don't need heavy libraries for everything. Storing the JWT token and User Object in React Context is lightweight, natively supported by React, and perfectly sufficient for 90% of SaaS applications.

## 2. API Handling & Interceptors
Notice how the frontend has an `api/` folder.
*   **The Lesson:** Never hardcode `fetch()` calls in your React components. By creating an Axios instance, you can create "Interceptors." If a user's token expires, an interceptor can automatically catch the `401 Unauthorized` error globally and log the user out, rather than writing that error-handling logic in 50 different files.

## 3. Separation of Concerns (The Backend Paradigm)
The biggest mistake junior developers make is putting 500 lines of code inside a single API route.
*   **The Lesson:** The route should ONLY care about HTTP (receiving JSON, sending JSON). The **Service** should ONLY care about business rules (math, logic, rules). The **Database Models** should ONLY care about SQL. This project strictly enforces this, making the codebase infinitely easier to read and test.

## 4. Handling Concurrency and Background Work
When users click a button, they expect a response in < 200ms.
*   **The Lesson:** If your app needs to recalculate a massive debt graph or send 5 emails, **do not do it in the main API thread**. This project uses FastAPI `BackgroundTasks` to offload work. In enterprise systems, this concept is king (usually implemented via AWS SQS, Celery, or Kafka).

## 5. Defensive Programming (FinTech Rules)
Expense splitting requires mathematical perfection.
*   **The Lesson:** You must assume the user (or frontend) will send bad data. The backend explicitly validates that percentage splits equal exactly 100%. It explicitly validates that exact amounts equal the total. It never trusts the client.

## Common Mistakes Prevented Here
*   **Orphaned Data:** We use database relationships with `ondelete="CASCADE"`. If a group is deleted, all its expenses and balances are automatically wiped by the SQL engine, preventing "ghost" data.
*   **Floating Point Math Errors:** Rounding is handled explicitly in the backend to 2 decimal places to prevent infinite trailing decimals (`0.33333333...`) from corrupting database sums.
