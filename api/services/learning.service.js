import { Curso, Leccion, Progreso, Inscripcion } from "../models/index.js";
import { AppError } from "../utils/AppError.js";
import { summarizeProgress } from "../utils/progress.js";

export async function courseProgress(enrollment, transaction) {
  const course = await Curso.findByPk(enrollment.cursoId, {
    attributes: ["id", "titulo", "estado"], transaction,
  });
  const lessons = await Leccion.findAll({
    attributes: ["id", "titulo", "tipo", "orden", "notaMinima"],
    where: { cursoId: enrollment.cursoId }, order: [["orden", "ASC"], ["id", "ASC"]], transaction,
  });
  const progress = await Progreso.findAll({
    attributes: ["leccionId", "completada", "mejorNota"],
    where: { inscripcionId: enrollment.id }, transaction,
  });
  return { curso: course, ...summarizeProgress(lessons, progress) };
}

async function accessibleLesson(enrollment, lessonId, transaction) {
  const progress = await courseProgress(enrollment, transaction);
  const status = progress.lecciones.find((lesson) => lesson.id === lessonId);
  if (!status) throw new AppError(404, "NOT_FOUND", "La lección no pertenece a este curso.");
  if (status.bloqueada) {
    throw new AppError(403, "LESSON_LOCKED", "Completa las lecciones anteriores para acceder a esta lección.");
  }
  return status;
}

export async function readLesson(enrollment, lessonId) {
  const status = await accessibleLesson(enrollment, lessonId);
  const attributes = ["id", "titulo", "tipo", "orden", "notaMinima", "cursoId"];
  if (status.tipo === "contenido") attributes.push("contenido", "videoUrl");
  const lesson = await Leccion.findByPk(lessonId, { attributes });
  if (!lesson) throw new AppError(404, "NOT_FOUND", "La lección no existe.");
  // No cargar Pregunta ni su clave. Rendir cuestionarios sigue fuera de esta etapa.
  return { ...lesson.toJSON(), progreso: status };
}

export function completeLesson(enrollment, lessonId) {
  return Inscripcion.sequelize.transaction(async (transaction) => {
    // Serializar escrituras del mismo estudiante/curso. Reintentar una solicitud
    // ya guardada no crea otra fila ni vuelve a sumar una lección.
    const locked = await Inscripcion.findByPk(enrollment.id, {
      transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!locked) throw new AppError(404, "NOT_FOUND", "La inscripción no existe.");
    const status = await accessibleLesson(locked, lessonId, transaction);
    if (status.tipo !== "contenido") {
      throw new AppError(409, "QUIZ_REQUIRED", "Un cuestionario solo se completa al aprobarlo.");
    }
    const where = { inscripcionId: locked.id, leccionId: lessonId };
    const saved = await Progreso.findOne({ where, transaction });
    if (!saved) await Progreso.create({ ...where, completada: true }, { transaction });
    else if (!saved.completada) await saved.update({ completada: true }, { transaction });
    const summary = await courseProgress(locked, transaction);
    await locked.update({ completado: summary.completado }, { transaction });
    return summary;
  });
}
