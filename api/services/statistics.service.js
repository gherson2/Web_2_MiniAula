import { Op, Transaction } from "sequelize";
import { Leccion, Inscripcion, Progreso, sequelize } from "../models/index.js";
import { summarizeProgress } from "../utils/progress.js";

const average = (values) => values.length ?
  Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 100) / 100 : null;

export function courseSummary(course) {
  // Una instantánea coherente incluso si llegan intentos durante la consulta.
  return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.REPEATABLE_READ }, async (transaction) => {
    const lessons = await Leccion.findAll({
      attributes: ["id", "titulo", "tipo", "orden", "notaMinima"],
      where: { cursoId: course.id }, order: [["orden", "ASC"], ["id", "ASC"]], transaction,
    });
    const enrollments = await Inscripcion.findAll({
      attributes: ["id"], where: { cursoId: course.id }, transaction,
    });
    const rows = enrollments.length ? await Progreso.findAll({
      attributes: ["inscripcionId", "leccionId", "completada", "intentos", "mejorNota"],
      where: { inscripcionId: { [Op.in]: enrollments.map((row) => row.id) } }, transaction,
    }) : [];
    const groups = new Map(enrollments.map((row) => [row.id, []]));
    for (const row of rows) groups.get(row.inscripcionId).push(row);
    const summaries = [...groups.values()].map((progress) => summarizeProgress(lessons, progress));
    const stops = new Map(lessons.map((lesson) => [lesson.id, 0]));
    for (const summary of summaries) {
      const next = summary.lecciones.find((lesson) => !lesson.completada && !lesson.bloqueada);
      if (next) stops.set(next.id, stops.get(next.id) + 1);
    }
    const quizIds = new Set(lessons.filter((lesson) => lesson.tipo === "cuestionario").map((lesson) => lesson.id));
    const attempted = rows.filter((row) => quizIds.has(row.leccionId) && row.intentos > 0);
    return {
      curso: { id: course.id, titulo: course.titulo, estado: course.estado },
      inscritos: enrollments.length,
      completados: summaries.filter((summary) => summary.completado).length,
      progresoPromedio: average(summaries.map((summary) => summary.porcentaje)) ?? 0,
      notaPromedio: average(attempted.map((row) => row.mejorNota)),
      cuestionariosIntentados: attempted.length,
      detenciones: lessons.map((lesson) => ({
        id: lesson.id, titulo: lesson.titulo, orden: lesson.orden, estudiantes: stops.get(lesson.id),
      })),
    };
  });
}
