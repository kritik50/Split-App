import API from "./api";

// 🔐 LOGIN

export const loginUser = (data) => {
  return API.post("/auth/login", {
    email: data.email,
    password: data.password,
  });
};



// 📝 REGISTER (FIXED)
export const registerUser = (data) => {
  return API.post("/auth/signup", {
    name: data.name,
    email: data.email,
    password: data.password,
  });
};