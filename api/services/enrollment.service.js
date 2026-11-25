import { Op } from "sequelize";
import { Curso, Usuario, Inscripcion, Leccion, Progreso } from "../models/index.js";
import { withCourseLock, ensureReady } from "./course.service.js";
import { AppError } from "../utils/AppError.js";
import { summarizeProgress } from "../utils/progress.js";

export function enroll(courseId, studentId) {
  // Compartir el bloqueo del curso con publicar/archivar/eliminar evita
  // inscribirse mientras se archiva y serializa inscripciones simultáneas.
  return withCourseLock(courseId, async (course, transaction) => {
    if (course.estado !== "publicado") {
      throw new AppError(404, "NOT_FOUND", "Solo puedes inscribirte en cursos publicados.");
    }
    const existing = await Inscripcion.findOne({
      where: { cursoId: courseId, estudianteId: studentId }, transaction,
    });
    if (existing) throw new AppError(409, "ALREADY_ENROLLED", "Ya estás inscrito en este curso.");
    await ensureReady(courseId, transaction);
    const enrollment = await Inscripcion.create({
      cursoId: courseId, estudianteId: studentId,
    }, { transaction });
    return {
      id: enrollment.id, cursoId: enrollment.cursoId,
      fechaInscripcion: enrollment.fechaInscripcion, completado: enrollment.completado,
    };
  });
}

function groupBy(rows, field) {
  const groups = new Map();
  for (const row of rows) {
    if (!groups.has(row[field])) groups.set(row[field], []);
    groups.get(row[field]).push(row);
  }
  return groups;
}

async function withProgress(enrollments) {
  if (!enrollments.length) return [];
  // Dos consultas para toda la página, no una consulta por cada curso.
  const [lessons, progress] = await Promise.all([
    Leccion.findAll({
      attributes: ["id", "cursoId", "tipo", "orden", "notaMinima"],
      where: { cursoId: { [Op.in]: enrollments.map((row) => row.cursoId) } },
      order: [["cursoId", "ASC"], ["orden", "ASC"], ["id", "ASC"]],
    }),
    Progreso.findAll({
      attributes: ["inscripcionId", "leccionId", "completada", "mejorNota"],
      where: { inscripcionId: { [Op.in]: enrollments.map((row) => row.id) } },
    }),
  ]);
  const lessonsByCourse = groupBy(lessons, "cursoId");
  const progressByEnrollment = groupBy(progress, "inscripcionId");
  return enrollments.map((row) => {
    const { completadas, total, porcentaje, completado } = summarizeProgress(
      lessonsByCourse.get(row.cursoId) || [], progressByEnrollment.get(row.id) || [],
    );
    return {
      ...row.toJSON(), completado,
      progreso: { completadas, total, porcentaje, completado },
    };
  });
}

export async function myEnrollments(studentId, { page, limit, cursoId }) {
  // El estudiante se toma exclusivamente del JWT, nunca del body/query.
  const where = { estudianteId: studentId };
  if (cursoId) where.cursoId = cursoId;
  const { count, rows } = await Inscripcion.findAndCountAll({
    attributes: ["id", "cursoId", "fechaInscripcion", "completado"],
    where,
    include: [{
      model: Curso, as: "curso",
      attributes: ["id", "titulo", "descripcion", "categoria", "nivel", "estado", "instructorId"],
      include: [{ model: Usuario, as: "instructor", attributes: ["id", "nombre"] }],
    }],
    order: [["fechaInscripcion", "DESC"], ["id", "DESC"]],
    limit, offset: (page - 1) * limit,
  });
  return {
    data: await withProgress(rows),
    pagination: { page, limit, total: count, pages: Math.ceil(count / limit) },
  };
}
