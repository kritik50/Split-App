# 📄 WORKFLOW_DEEP_DIVE.md

Let's debug a real-world flow step-by-step. 

## Scenario: User adds a $100 Expense split equally between themselves and a friend.

### Step 1: The User Interaction (Frontend UI)
*   The user fills out the "Add Expense" form in React.
*   They type "Dinner", amount "100", select "Equal Split", and click Submit.
*   **Code execution:** The form's `onSubmit` handler in React triggers. It formats the data into a JSON object.

### Step 2: The API Request (Frontend API Layer)
*   The React component calls `expenseApi.createExpense(data)`.
*   Axios intercepts this, grabs the JWT token from `localStorage`, attaches it to the headers, and sends a `POST` request over the internet to `http://localhost:8000/expenses/`.

### Step 3: Security & Routing (Backend)
*   FastAPI receives the request at `main.py` and routes it to `routes/expense.py`.
*   Before the route code even runs, the `Depends(get_current_user)` dependency fires. It decrypts the JWT token, verifies the user exists, and passes the `current_user` into the function.
*   FastAPI uses Pydantic (`ExpenseCreate` schema) to validate the JSON. If the amount was a string instead of a number, it would automatically throw a `422 Validation Error` here.

### Step 4: Business Logic (Backend Service)
*   The route passes the validated data to `ExpenseService.create_expense()`.
*   **Validation:** The service checks if the user is actually in the group they are trying to post to.
*   **Math:** Because it's an "equal" split, the service runs the `_rounded_share` function. It splits $100 by 2, resulting in exactly $50 each.
*   **Database Writes:** 
    1.  It creates an `Expense` record in the database.
    2.  It creates two `ExpenseSplit` records.
    3.  It calls `update_balance()`. This function checks the `balances` table. Since the current user paid $100, the friend now owes the current user $50. The balance table is updated.
*   **Commit:** `db.commit()` is called, permanently saving this to the hard drive.
*   **Background Job:** `background_tasks.add_task()` is triggered to run the `process_async_settlement` silently.

### Step 5: The Response
*   The service returns `{"message": "Expense created successfully"}` back to the route.
*   The route sends this JSON back to the frontend with a `200 OK` HTTP status.

### Step 6: UI Update (Frontend)
*   Axios receives the `200 OK`.
*   React closes the "Add Expense" modal.
*   React triggers a re-fetch of `groupApi.getGroupSummary()` to get the new total balances.
*   The React components re-render, showing the new expense and the updated "Who owes whom" chart.

---
### 🐛 Debugging Like a Pro
If a user complains: *"I added an expense but it didn't show up!"*
1.  **Check Network Tab (Browser):** Did the frontend actually send the request? Did it return a 400 error (bad math) or a 401 (token expired)?
2.  **Check Backend Logs:** Did the `create_expense` route get hit? Did it throw a Python exception?
3.  **Check Database:** Open the SQLite file. Did the `Expense` row get created but the `Balance` row fail? 
This step-by-step thinking isolates exactly where the chain broke.
