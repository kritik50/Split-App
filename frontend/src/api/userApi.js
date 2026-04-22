import api from "./api";

export const getUserActivity = () => api.get("/users/activity");
export const getBalancesSummary = () => api.get("/users/balances-summary");
