import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EnrollmentService } from "../services/EnrollmentService";
import { useResource } from "../hooks/useResource";
import { CourseArt, levelLabels, stateLabels } from "../components/CourseCard";
import { Loading, ErrorAlert, EmptyState } from "../components/Feedback";
import { Pagination } from "../components/Pagination";

export function MyCoursesPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const resource = useResource(useCallback((signal) =>
    EnrollmentService.mine({ page, limit: 6 }, signal), [page]));
  return <section>
    <span className="eyebrow">TU ESPACIO PARA APRENDER</span><h1>Mis cursos</h1>
    <p className="text-secondary">Aquí se guardan las inscripciones de tu cuenta.</p>
    <div className="stage-notice mb-4">En este avance puedes inscribirte y consultar tu lista.
      El contenido para estudiantes, el porcentaje de progreso y los cuestionarios siguen pendientes.</div>
    {resource.loading ? <Loading /> : resource.error ? <ErrorAlert message={resource.error} retry={resource.reload} /> :
      resource.data.data.length === 0 ? <EmptyState title="Todavía no te inscribiste en un curso">
        <Link to="/cursos">Explorar el catálogo</Link>
      </EmptyState> : <>
        <div className="row g-4">{resource.data.data.map(({ id, curso, fechaInscripcion }) =>
          <div className="col-12 col-md-6 col-lg-4" key={id}>
            <article className="course-card">
              <CourseArt course={curso} />
              <div className="course-card-body">
                <div className="d-flex justify-content-between gap-2 mb-3">
                  <span className="category-label">{curso.categoria}</span>
                  <span className={`status-badge status-${curso.estado}`}>{stateLabels[curso.estado]}</span>
                </div>
                <h2 className="h5">{curso.titulo}</h2>
                <p className="small text-secondary mb-2">Instructor: {curso.instructor.nombre}</p>
                <p className="small text-secondary">Inscrito el {new Date(fechaInscripcion).toLocaleDateString("es")}</p>
                {curso.estado === "archivado" ? <div className="stage-notice">
                  Este curso fue archivado. Tu inscripción se conserva.
                </div> : <div className="course-card-footer">
                  <span className="level-label">{levelLabels[curso.nivel]}</span>
                  <Link className="course-link" to={`/cursos/${curso.id}`}>Ver temario ↗</Link>
                </div>}
              </div>
            </article>
          </div>)}</div>
        <Pagination pagination={resource.data.pagination} onChange={(next) => setParams({ page: String(next) })} />
      </>}
  </section>;
}
