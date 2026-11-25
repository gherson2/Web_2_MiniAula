import { api } from "./api";

export const LearningService = {
  progress: async (courseId, signal) => (await api.get(`/cursos/${courseId}/progreso`, { signal })).data,
  lesson: async (lessonId, signal) => (await api.get(`/lecciones/${lessonId}`, { signal })).data,
  complete: async (lessonId) => (await api.post(`/lecciones/${lessonId}/completar`)).data,
  attempt: async (lessonId, respuestas) => (await api.post(`/lecciones/${lessonId}/intentos`, { respuestas })).data,
};
