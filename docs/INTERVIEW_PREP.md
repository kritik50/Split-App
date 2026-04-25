# 📄 INTERVIEW_PREP.md

If you put this project on your resume, here is exactly how an engineering manager will grill you, and how you should answer.

---

## 1. Architecture & System Design

**Q: I see you used FastAPI and React. Why didn't you put all your database logic directly inside your API routes?**
*   **Bad Answer:** "Because I saw a tutorial do it this way."
*   **Strong Answer:** "I explicitly implemented a Controller-Service-Repository architecture. I moved the business logic (like debt calculation) into a `Service` layer, and kept the API `Routes` clean. This achieves Separation of Concerns. If I ever want to expose a GraphQL endpoint or write unit tests, I can test the Service layer independently without needing to mock HTTP requests."

**Q: How would you scale this application if it suddenly got 100,000 active users?**
*   **Strong Answer:** 
    1.  **Database:** I would migrate from SQLite to PostgreSQL (which the app is already configured for via Docker) because SQLite locks the database on writes, blocking concurrent users.
    2.  **Caching:** I would introduce Redis to cache the "Group Summary" and "Balances" API calls, as those are read-heavy and require calculating sums.
    3.  **Background Workers:** I currently use FastAPI `BackgroundTasks`. At scale, I would move this to **Celery + Redis** so that heavy debt-simplification algorithms don't consume web server CPU resources.

---

## 2. Deep Technical Questions

**Q: How did you handle edge cases with currency rounding? If you split $10 among 3 people, it's $3.33 each, leaving 1 cent unaccounted for. How does your app prevent database corruption?**
*   **Strong Answer:** "This is a classic FinTech problem. I wrote a specific algorithm (`_rounded_share`) that calculates the rounded share for everyone. It then sums those shares, subtracts it from the exact total, and takes the remainder (the missing pennies) and adds it to the final person's split. This guarantees the splits always sum to the exact expense amount down to the cent."

**Q: What happens if a user tries to leave a group, but they still owe someone money?**
*   **Strong Answer:** "In `group_service.py`, I implemented strict validation on the `remove_member` endpoint. Before executing the database delete, it queries the `Balances` table. If the user's ID exists as a debtor or creditor with an amount > 0, the API throws a `400 Bad Request` and blocks the deletion. Financial integrity is preserved."

---

## 3. Behavioral Questions

**Q: Explain a technical challenge you faced while building this project and how you solved it.**
*   **Strong Answer:** "A major challenge was the Debt Simplification algorithm. When 10 people are in a group paying for random things, you get a tangled web of debts (A owes B, B owes C). Instead of showing 50 confusing transactions, I implemented a greedy algorithm. I first calculate every user's 'Net Balance' (are they overall positive or negative). I separate them into Debtors and Creditors, and iteratively match the highest debtor to the highest creditor until the balances hit zero. This reduced dozens of transactions down to just the absolute minimum required."

**Q: What would you improve if you had another month to work on this?**
*   **Strong Answer:** "I would implement WebSockets. Currently, if two friends are looking at the app, and one adds an expense, the other has to refresh the page to see it. Adding WebSockets would push the balance updates to the frontend in real-time."
