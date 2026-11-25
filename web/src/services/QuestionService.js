import { api } from "./api";

export const QuestionService = {
  list: async (lessonId, params, signal) =>
    (await api.get(`/lecciones/${lessonId}/preguntas`, { params, signal })).data,
  create: async (lessonId, data) => (await api.post(`/lecciones/${lessonId}/preguntas`, data)).data,
  update: async (id, data) => (await api.put(`/preguntas/${id}`, data)).data,
  remove: async (id) => api.delete(`/preguntas/${id}`),
};
