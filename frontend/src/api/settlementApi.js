import api from "./api";

export const createSettlement = (data) => api.post("/settlements/", data);
export const getOptimizedSettlements = (groupId) =>
  api.get(`/settlements/group/${groupId}/optimize`);
