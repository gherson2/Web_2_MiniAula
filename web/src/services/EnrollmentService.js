import { api } from "./api";

export const EnrollmentService = {
  enroll: async (courseId) => (await api.post(`/cursos/${courseId}/inscripcion`)).data,
  mine: async (params, signal) => (await api.get("/inscripciones/mias", { params, signal })).data,
};
