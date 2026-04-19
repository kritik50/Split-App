import api from "./api";

// Single optimized sidebar call — replaces separate groups + stats calls
export const getSidebarData = () => api.get("/sidebar");
