import { Leccion, Pregunta } from "../models/index.js";
import { withCourseLock, ensureNoEnrollments } from "./course.service.js";
import { AppError } from "../utils/AppError.js";

const safeFields = ["id", "enunciado", "opciones", "leccionId"];
function publicQuestion(question) {
  // create/update contienen la clave en su instancia: nunca devolverla completa.
  return Object.fromEntries(safeFields.map((field) => [field, question[field]]));
}
function requireQuiz(lesson) {
  if (!lesson) throw new AppError(404, "NOT_FOUND", "El cuestionario no existe.");
  if (lesson.tipo !== "cuestionario") {
    throw new AppError(409, "NOT_QUIZ", "Solo las lecciones de cuestionario pueden tener preguntas.");
  }
}
function editQuiz(lesson, action) {
  return withCourseLock(lesson.cursoId, async (course, transaction) => {
    const current = await Leccion.findByPk(lesson.id, { transaction });
    requireQuiz(current);
    await ensureNoEnrollments(course.id, transaction);
    return action(current, transaction);
  });
}
async function findQuestion(id, lessonId, transaction) {
  const question = await Pregunta.findOne({
    where: { id, leccionId: lessonId }, attributes: safeFields, transaction,
  });
  if (!question) throw new AppError(404, "NOT_FOUND", "La pregunta no existe.");
  return question;
}

export async function listQuestions(lesson, { page, limit }) {
  requireQuiz(lesson);
  const { count, rows } = await Pregunta.findAndCountAll({
    where: { leccionId: lesson.id }, attributes: safeFields,
    order: [["id", "ASC"]], offset: (page - 1) * limit, limit,
  });
  return {
    leccion: {
      id: lesson.id, titulo: lesson.titulo, tipo: lesson.tipo,
      notaMinima: lesson.notaMinima, cursoId: lesson.cursoId,
    },
    data: rows.map(publicQuestion),
    pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
  };
}

export function createQuestion(lesson, data) {
  return editQuiz(lesson, async (current, transaction) => {
    const count = await Pregunta.count({ where: { leccionId: current.id }, transaction });
    if (count >= 100) throw new AppError(409, "QUESTION_LIMIT", "El cuestionario admite hasta 100 preguntas.");
    const question = await Pregunta.create({ ...data, leccionId: current.id }, { transaction });
    return publicQuestion(question);
  });
}

export function updateQuestion(questionId, lesson, data) {
  return editQuiz(lesson, async (current, transaction) => {
    const question = await findQuestion(questionId, current.id, transaction);
    await question.update(data, { transaction });
    return publicQuestion(question);
  });
}

export function deleteQuestion(questionId, lesson) {
  return editQuiz(lesson, async (current, transaction) => {
    const question = await findQuestion(questionId, current.id, transaction);
    await question.destroy({ transaction });
  });
}
