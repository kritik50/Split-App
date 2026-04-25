import api from "./api";


export const createGroup = (data) =>
  api.post("/groups/", data);

export const getGroups = () =>
  api.get("/groups/");

export const getGroupMembers = (groupId) =>
  api.get(`/groups/${groupId}/members`);

export const getGroupSummary = (groupId) =>
  api.get(`/groups/${groupId}/summary`);

export const getGroupBalances = (groupId) =>
  api.get(`/groups/${groupId}/balances`);

export const deleteGroup = (groupId) =>
  api.delete(`/groups/${groupId}`);

// ✅ FIXED: now sends { email } instead of { user_id }
export const addMemberToGroup = (groupId, email) =>
  api.post(`/groups/${groupId}/members`, { email });

// ✅ NEW: search for a user by email before adding (for validation UI)
export const searchUserByEmail = (email) =>
  api.get(`/users/search?email=${encodeURIComponent(email)}`);

export const exportGroupCsv = (groupId) =>
  api.get(`/groups/${groupId}/export`, { responseType: "blob" });