import { Leccion } from "../models/index.js";
import { withCourseLock, ensureNoEnrollments } from "./course.service.js";
import { AppError } from "../utils/AppError.js";

export function createLesson(courseId, data) {
  return withCourseLock(courseId, async (course, transaction) => {
    await ensureNoEnrollments(courseId, transaction);
    const max = await Leccion.max("orden", { where: { cursoId: courseId }, transaction });
    return Leccion.create({
      ...data, tipo: "contenido", cursoId: courseId, orden: (max || 0) + 1,
    }, { transaction });
  });
}

export function updateLesson(lesson, data) {
  return withCourseLock(lesson.cursoId, async (course, transaction) => {
    await ensureNoEnrollments(course.id, transaction);
    if (lesson.tipo !== "contenido") {
      throw new AppError(409, "QUIZ_NOT_EDITABLE", "El editor de cuestionarios corresponde a la siguiente etapa.");
    }
    return lesson.update(data, { transaction });
  });
}

export function deleteLesson(lesson) {
  return withCourseLock(lesson.cursoId, async (course, transaction) => {
    await ensureNoEnrollments(course.id, transaction);
    const lessons = await Leccion.findAll({
      where: { cursoId: course.id }, order: [["orden", "ASC"]], transaction,
    });
    if (course.estado === "publicado" && lessons.length === 1) {
      throw new AppError(409, "LAST_LESSON", "No puedes dejar un curso publicado sin lecciones.");
    }
    await lesson.destroy({ transaction });
    const remaining = lessons.filter((item) => item.id !== lesson.id);
    for (const [index, item] of remaining.entries()) {
      await item.update({ orden: index + 1 }, { transaction });
    }
  });
}

export function reorderLessons(courseId, ids) {
  return withCourseLock(courseId, async (course, transaction) => {
    await ensureNoEnrollments(courseId, transaction);
    const lessons = await Leccion.findAll({ where: { cursoId: courseId }, transaction });
    if (lessons.length !== ids.length || lessons.some((lesson) => !ids.includes(lesson.id))) {
      throw new AppError(422, "INVALID_ORDER", "Envía todas las lecciones del curso, sin agregar otras.");
    }
    for (const [index, id] of ids.entries()) {
      await Leccion.update({ orden: index + 1 }, { where: { id, cursoId: courseId }, transaction });
    }
    return { message: "Orden actualizado." };
  });
}
