import api from "./api";

// ➕ Add expense
export const addExpense = (data) => api.post("/expenses/", data);

// 📋 Get expenses by group
export const getExpensesByGroup = (groupId) => api.get(`/expenses/group/${groupId}`);

// ✏️ Edit expense
export const updateExpense = (expenseId, data) => api.put(`/expenses/${expenseId}`, data);

// 🗑️ Delete expense
export const deleteExpense = (expenseId) => api.delete(`/expenses/${expenseId}`);