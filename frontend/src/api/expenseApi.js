import api from "./api";

// ➕ Add expense
export const addExpense = (data) => {
  return api.post("/expenses/", data);
};

// 📋 Get expenses by group
export const getExpensesByGroup = (groupId) => {
  return api.get(`/expenses/group/${groupId}`);
};