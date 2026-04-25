# 📄 FRONTEND_GUIDE.md

## High-Level Overview
The frontend is a **React.js** application built with Vite. It does not use bulky CSS frameworks like Tailwind or Bootstrap; instead, it relies on highly optimized, Apple-inspired vanilla CSS (`index.css`) utilizing "Glassmorphism" for a premium, lightweight feel.

## Folder Structure (Mental Model)
*   `/src/api`: Contains Axios instances and API wrapper functions (`groupApi.js`, `expenseApi.js`). This isolates all backend communication into one place.
*   `/src/components`: Reusable UI pieces (e.g., `AppLayout`, `ProtectedRoute`).
*   `/src/context`: React Context API files for global state management (`AuthContext`, `SidebarContext`).
*   `/src/pages`: The actual views the user sees (`Login`, `Groups`, `AllExpenses`, `Balances`).
*   `/src/App.jsx`: The root component where React Router connects URLs to Pages.

## Key Concepts to Understand

### 1. Routing System
We use `react-router-dom`. Inside `App.jsx`, paths are mapped to components.
*   **Public Routes:** (`/login`, `/register`) are accessible to anyone.
*   **Protected Routes:** We wrap authenticated pages inside a `<ProtectedRoute>` component. If a user without a valid JWT token tries to access `/groups`, the `ProtectedRoute` intercepts them and redirects them back to `/login`.

### 2. State Management (React Context)
Instead of passing "user data" down through 10 layers of components (Prop Drilling) or using heavy libraries like Redux, the app uses **React Context**.
*   **AuthContext:** Holds the `user` object and `token`. Any component in the app can ask the `AuthContext`, *"Hey, who is currently logged in?"* without needing it passed as a prop.

### 3. API Integration Layer
Notice how components don't have `fetch('http://localhost:8000/groups')` written inside them.
Instead, they call `groupApi.getGroups()`.
*   **Why?** This is a best practice. If the backend URL changes, or if we need to attach an Authorization header to every request, we only update the `/api/` files, not 50 different React components.

### 4. How UI Interacts with Backend (The Flow)
When you log in:
1.  React collects the email/password from the `<input>` fields.
2.  It calls `authApi.login(email, password)`.
3.  The backend returns a JWT token.
4.  React saves this token in `localStorage` (so you stay logged in after refreshing) and updates the `AuthContext`.
5.  React Router redirects you to the `/groups` dashboard.

### 🧠 Analogy for the Frontend
The frontend is like a **TV Screen + Remote Control**. It doesn't actually generate the TV shows (data); it just fetches the signal from the cable box (backend) and displays it beautifully. The React Context is like the TV's memory, remembering which channel you are currently watching.
