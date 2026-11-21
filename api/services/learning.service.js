import { Curso, Leccion, Progreso } from "../models/index.js";
import { AppError } from "../utils/AppError.js";

export async function courseProgress(enrollment) {
  const course = await Curso.findByPk(enrollment.cursoId, {
    attributes: ["id", "titulo", "estado"],
  });
  const lessons = await Leccion.findAll({
    attributes: ["id", "titulo", "tipo", "orden", "notaMinima"],
    where: { cursoId: enrollment.cursoId }, order: [["orden", "ASC"], ["id", "ASC"]],
  });
  const progress = await Progreso.findAll({
    attributes: ["leccionId", "completada", "mejorNota"],
    where: { inscripcionId: enrollment.id },
  });
  const byLesson = new Map(progress.map((row) => [row.leccionId, row]));
  let previousComplete = true;
  const lecciones = lessons.map((lesson) => {
    const saved = byLesson.get(lesson.id);
    const completed = Boolean(saved?.completada) &&
      (lesson.tipo !== "cuestionario" || saved.mejorNota >= lesson.notaMinima);
    const status = {
      id: lesson.id, titulo: lesson.titulo, tipo: lesson.tipo, orden: lesson.orden,
      notaMinima: lesson.notaMinima, bloqueada: !previousComplete, completada: completed,
    };
    // No se permite saltar una lección previa, aunque existan filas inconsistentes.
    previousComplete = previousComplete && completed;
    return status;
  });
  const completedCount = lecciones.filter((lesson) => lesson.completada).length;
  return {
    curso: course, lecciones, completadas: completedCount, total: lecciones.length,
    porcentaje: lecciones.length ? Math.round(completedCount * 100 / lecciones.length) : 0,
  };
}

export async function readLesson(enrollment, lessonId) {
  const progress = await courseProgress(enrollment);
  const status = progress.lecciones.find((lesson) => lesson.id === lessonId);
  if (!status) throw new AppError(404, "NOT_FOUND", "La lección no pertenece a este curso.");
  if (status.bloqueada) {
    throw new AppError(403, "LESSON_LOCKED", "Completa las lecciones anteriores para acceder a esta lección.");
  }
  const attributes = ["id", "titulo", "tipo", "orden", "notaMinima", "cursoId"];
  if (status.tipo === "contenido") attributes.push("contenido", "videoUrl");
  const lesson = await Leccion.findByPk(lessonId, { attributes });
  if (!lesson) throw new AppError(404, "NOT_FOUND", "La lección no existe.");
  // No cargar Pregunta ni su clave. Rendir cuestionarios sigue fuera de esta etapa.
  return { ...lesson.toJSON(), progreso: status };
}
