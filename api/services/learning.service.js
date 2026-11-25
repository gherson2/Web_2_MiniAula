import { Curso, Leccion, Progreso, Inscripcion, Pregunta } from "../models/index.js";
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
    attributes: ["leccionId", "completada", "mejorNota", "intentos"],
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
  const preguntas = status.tipo === "cuestionario" ? await Pregunta.findAll({
    attributes: ["id", "enunciado", "opciones"], where: { leccionId: lessonId },
    order: [["id", "ASC"]],
  }) : undefined;
  return { ...lesson.toJSON(), ...(preguntas ? { preguntas } : {}), progreso: status };
}

export function submitAttempt(enrollment, lessonId, { respuestas }) {
  return Inscripcion.sequelize.transaction(async (transaction) => {
    // El mismo bloqueo que completar contenido: protege también la primera fila.
    const locked = await Inscripcion.findByPk(enrollment.id, {
      transaction, lock: transaction.LOCK.UPDATE,
    });
    if (!locked) throw new AppError(404, "NOT_FOUND", "La inscripción no existe.");
    const status = await accessibleLesson(locked, lessonId, transaction);
    if (status.tipo !== "cuestionario") throw new AppError(409, "NOT_QUIZ", "Esta lección no es un cuestionario.");
    const where = { inscripcionId: locked.id, leccionId: lessonId };
    const saved = await Progreso.findOne({ where, transaction });
    if (saved?.intentos >= 3) throw new AppError(409, "ATTEMPT_LIMIT", "Ya utilizaste los tres intentos.");
    // Consulta exclusivamente interna. Nunca devolver estas instancias por HTTP.
    const questions = await Pregunta.unscoped().findAll({
      attributes: ["id", "opciones", "indiceCorrecto"], where: { leccionId: lessonId }, transaction,
    });
    if (!questions.length) throw new AppError(409, "EMPTY_QUIZ", "El cuestionario todavía no tiene preguntas.");
    const answers = new Map(respuestas.map((answer) => [answer.preguntaId, answer.indiceElegido]));
    if (answers.size !== questions.length || respuestas.length !== questions.length ||
      questions.some((question) => !answers.has(question.id) ||
        answers.get(question.id) >= question.opciones.length)) {
      throw new AppError(422, "INVALID_ANSWERS", "Responde todas las preguntas con opciones existentes y sin preguntas ajenas.");
    }
    const correct = questions.filter((question) => answers.get(question.id) === question.indiceCorrecto).length;
    const nota = Math.round(correct * 100 / questions.length);
    const mejorNota = Math.max(saved?.mejorNota || 0, nota);
    // Comparar sin redondear: 2/3 no aprueba un mínimo de 67.
    const aprobado = correct * 100 >= status.notaMinima * questions.length;
    const values = {
      intentos: (saved?.intentos || 0) + 1, mejorNota,
      completada: Boolean(saved?.completada) || aprobado,
    };
    if (saved) await saved.update(values, { transaction });
    else await Progreso.create({ ...where, ...values }, { transaction });
    const progreso = await courseProgress(locked, transaction);
    await locked.update({ completado: progreso.completado }, { transaction });
    return { nota, aprobado, mejorNota, intentos: values.intentos,
      intentosRestantes: 3 - values.intentos, progreso };
  });
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
