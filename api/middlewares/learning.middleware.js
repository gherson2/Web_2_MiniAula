import { Curso, Leccion, Inscripcion } from "../models/index.js";
import { AppError } from "../utils/AppError.js";

async function findEnrollment(courseId, studentId) {
  const course = await Curso.findByPk(courseId, { attributes: ["id", "estado"] });
  if (!course || course.estado === "borrador") {
    throw new AppError(404, "NOT_FOUND", "El curso no está disponible.");
  }
  const enrollment = await Inscripcion.findOne({
    where: { cursoId: courseId, estudianteId: studentId },
  });
  if (!enrollment) {
    throw new AppError(403, "NOT_ENROLLED", "Debes inscribirte en este curso para acceder al aula.");
  }
  return enrollment;
}

export async function enrolledCourse(req, res, next) {
  req.enrollment = await findEnrollment(req.validated.params.id, req.user.id);
  next();
}

export async function enrolledLesson(req, res, next) {
  // Primero verificar inscripción; el contenido se consulta luego en el servicio.
  const lesson = await Leccion.findByPk(req.validated.params.id, { attributes: ["id", "cursoId"] });
  if (!lesson) throw new AppError(404, "NOT_FOUND", "La lección no existe.");
  req.enrollment = await findEnrollment(lesson.cursoId, req.user.id);
  next();
}
