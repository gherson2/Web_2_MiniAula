// Una misma regla para el aula y la lista de cursos. Recibe lecciones ordenadas
// y exclusivamente las filas de progreso de una inscripción.
export function summarizeProgress(lessons, progress) {
  const byLesson = new Map(progress.map((row) => [row.leccionId, row]));
  let previousComplete = true;
  const lecciones = lessons.map((lesson) => {
    const saved = byLesson.get(lesson.id);
    const completed = Boolean(saved?.completada) &&
      (lesson.tipo !== "cuestionario" || saved.mejorNota >= lesson.notaMinima);
    const status = {
      id: lesson.id, titulo: lesson.titulo, tipo: lesson.tipo, orden: lesson.orden,
      notaMinima: lesson.notaMinima, bloqueada: !previousComplete, completada: completed,
      ...(lesson.tipo === "cuestionario" ? {
        intentos: saved?.intentos || 0,
        intentosRestantes: Math.max(0, 3 - (saved?.intentos || 0)),
        mejorNota: saved?.intentos > 0 ? saved.mejorNota : null,
      } : {}),
    };
    previousComplete = previousComplete && completed;
    return status;
  });
  const completedCount = lecciones.filter((lesson) => lesson.completada).length;
  return {
    lecciones, completadas: completedCount, total: lecciones.length,
    porcentaje: lecciones.length ? Math.round(completedCount * 100 / lecciones.length) : 0,
    completado: lecciones.length > 0 && completedCount === lecciones.length,
  };
}
