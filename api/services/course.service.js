import { Op } from "sequelize";
import { Curso, Leccion, Usuario, Inscripcion, sequelize } from "../models/index.js";
import { AppError } from "../utils/AppError.js";

const instructor = { model: Usuario, as: "instructor", attributes: ["id", "nombre"] };
const syllabusFields = ["id", "titulo", "tipo", "orden", "notaMinima"];

export async function listCourses({ q, categoria, page, limit }, instructorId = null) {
  const where = instructorId ? { instructorId } : { estado: "publicado" };
  if (q) where.titulo = { [Op.iLike]: `%${q.replace(/[\\%_]/g, "\\$&")}%` };
  if (categoria) where.categoria = categoria;
  const { count, rows } = await Curso.findAndCountAll({
    where, include: [instructor], order: [["creadoEn", "DESC"], ["id", "DESC"]],
    offset: (page - 1) * limit, limit,
  });
  return { data: rows, pagination: { page, limit, total: count, pages: Math.ceil(count / limit) } };
}

export async function categories() {
  const rows = await Curso.findAll({
    attributes: ["categoria"], where: { estado: "publicado" },
    group: ["categoria"], order: [["categoria", "ASC"]],
  });
  return rows.map((row) => row.categoria);
}

export async function publicDetail(id) {
  const course = await Curso.findOne({
    where: { id, estado: "publicado" },
    include: [instructor, { model: Leccion, as: "lecciones", attributes: syllabusFields }],
    order: [[{ model: Leccion, as: "lecciones" }, "orden", "ASC"]],
  });
  if (!course) throw new AppError(404, "NOT_FOUND", "El curso no está disponible.");
  return course;
}

export async function privateDetail(id) {
  return Curso.findByPk(id, {
    include: [{ model: Leccion, as: "lecciones" }],
    order: [[{ model: Leccion, as: "lecciones" }, "orden", "ASC"]],
  });
}

export function createCourse(data, instructorId) {
  return Curso.create({ ...data, instructorId, estado: "borrador" });
}

export function updateCourse(course, data) {
  return course.update(data);
}

// Las operaciones estructurales bloquean el curso para evitar órdenes duplicados
// o publicar un curso mientras se elimina su última lección.
export function withCourseLock(id, action) {
  return sequelize.transaction(async (transaction) => {
    const course = await Curso.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!course) throw new AppError(404, "NOT_FOUND", "El curso no existe.");
    return action(course, transaction);
  });
}

export async function ensureNoEnrollments(courseId, transaction) {
  const count = await Inscripcion.count({ where: { cursoId: courseId }, transaction });
  if (count > 0) {
    throw new AppError(409, "COURSE_HAS_STUDENTS",
      "El curso tiene inscritos. Puedes editar sus datos o archivarlo, pero no cambiar su estructura ni eliminarlo.");
  }
}

export function changeState(id, estado) {
  return withCourseLock(id, async (course, transaction) => {
    const lessons = await Leccion.count({ where: { cursoId: id }, transaction });
    if (estado === "publicado" && lessons === 0) {
      throw new AppError(409, "EMPTY_COURSE", "Agrega al menos una lección antes de publicar.");
    }
    return course.update({ estado }, { transaction });
  });
}

export function deleteCourse(id) {
  return withCourseLock(id, async (course, transaction) => {
    await ensureNoEnrollments(id, transaction);
    await course.destroy({ transaction });
  });
}
