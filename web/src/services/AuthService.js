import { api } from "./api";

export const AuthService = {
  login: async (data) => (await api.post("/auth/login", data, { publicRequest: true })).data,
  register: async (data) => (await api.post("/auth/register", data, { publicRequest: true })).data,
  me: async (signal) => (await api.get("/users/me", { signal })).data,
  update: async (data) => (await api.put("/users/me", data)).data,
};
