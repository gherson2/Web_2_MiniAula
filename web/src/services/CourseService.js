import { api } from "./api";

export const CourseService = {
  catalog: async (params, signal) => (await api.get("/cursos", { params, signal })).data,
  categories: async (signal) => (await api.get("/categorias", { signal })).data,
  detail: async (id, signal) => (await api.get(`/cursos/${id}`, { signal })).data,
  mine: async (params, signal) => (await api.get("/instructor/cursos", { params, signal })).data,
  editDetail: async (id, signal) => (await api.get(`/instructor/cursos/${id}`, { signal })).data,
  create: async (data) => (await api.post("/cursos", data)).data,
  update: async (id, data) => (await api.put(`/cursos/${id}`, data)).data,
  state: async (id, estado) => (await api.patch(`/cursos/${id}/estado`, { estado })).data,
  remove: async (id) => api.delete(`/cursos/${id}`),
  addLesson: async (id, data) => (await api.post(`/cursos/${id}/lecciones`, data)).data,
  updateLesson: async (id, data) => (await api.put(`/lecciones/${id}`, data)).data,
  removeLesson: async (id) => api.delete(`/lecciones/${id}`),
  reorder: async (id, lecciones) => (await api.patch(`/cursos/${id}/lecciones/orden`, { lecciones })).data,
};
