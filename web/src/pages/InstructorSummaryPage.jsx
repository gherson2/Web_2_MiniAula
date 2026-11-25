import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { CourseService } from "../services/CourseService";
import { useResource } from "../hooks/useResource";
import { Loading, ErrorAlert } from "../components/Feedback";
import { ProgressBar } from "../components/ProgressBar";

export function InstructorSummaryPage() {
  const { id } = useParams();
  const resource = useResource(useCallback((signal) => CourseService.summary(id, signal), [id]));
  if (resource.loading) return <Loading />;
  if (resource.error) return <ErrorAlert message={resource.error} retry={resource.reload} />;
  const summary = resource.data;
  return <>
    <Link className="back-link" to={`/instructor/cursos/${id}/editar`}>← Editor del curso</Link>
    <span className="eyebrow d-block">PANEL DEL INSTRUCTOR</span>
    <h1>{summary.curso.titulo}</h1>
    <button className="btn btn-outline-secondary mb-4" onClick={resource.reload}>Actualizar estadísticas</button>
    <div className="row g-3 mb-4">
      {[
        ["Inscritos", summary.inscritos],
        ["Finalizaron el curso", summary.completados],
        ["Progreso promedio", `${summary.progresoPromedio} %`],
        ["Nota promedio", summary.notaPromedio == null ? "Sin intentos" : `${summary.notaPromedio} / 100`],
      ].map(([label, value]) => <div className="col-sm-6 col-lg-3" key={label}>
        <section className="surface-panel h-100"><h2 className="h6">{label}</h2>
          <p className="h3 mb-0">{value}</p></section>
      </div>)}
    </div>
    <section className="surface-panel mb-4">
      <h2 className="h5">Progreso del curso</h2>
      <ProgressBar value={summary.progresoPromedio} />
      <p className="small text-secondary mt-3 mb-0">La nota promedio usa la mejor nota de cada cuestionario
        intentado por estudiante ({summary.cuestionariosIntentados} registros). Los cuestionarios sin intentos no cuentan como cero.</p>
    </section>
    <section className="surface-panel">
      <h2 className="h5">Dónde se detienen los estudiantes</h2>
      <p className="text-secondary">Primera lección pendiente de cada estudiante; no indica abandono.
        Quienes terminaron el curso no aparecen en este conteo.</p>
      {!summary.detenciones.length ? <p>Este curso todavía no tiene lecciones.</p> :
        <ol className="list-group list-group-numbered">{summary.detenciones.map((lesson) =>
          <li className="list-group-item d-flex gap-2 justify-content-between" key={lesson.id}>
            <span className="flex-grow-1">{lesson.titulo}</span>
            <span className="badge bg-primary rounded-pill">{lesson.estudiantes}</span>
          </li>)}</ol>}
      {!summary.inscritos && <p className="mt-3 mb-0">Todavía no hay estudiantes inscritos.</p>}
    </section>
  </>;
}
