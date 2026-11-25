import { useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { EnrollmentService } from "../services/EnrollmentService";
import { useResource } from "../hooks/useResource";
import { CourseArt, levelLabels, stateLabels } from "../components/CourseCard";
import { Loading, ErrorAlert, EmptyState } from "../components/Feedback";
import { Pagination } from "../components/Pagination";
import { ProgressBar } from "../components/ProgressBar";

export function MyCoursesPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const resource = useResource(useCallback((signal) =>
    EnrollmentService.mine({ page, limit: 6 }, signal), [page]));
  return <section>
    <span className="eyebrow">TU ESPACIO PARA APRENDER</span><h1>Mis cursos</h1>
    <p className="text-secondary">Tus cursos inscritos y el avance que ya guardaste.</p>
    <div className="stage-notice mb-4">Abre el aula para leer las lecciones desbloqueadas de tus cursos.
      El progreso de esta lista se calcula en el servidor a partir de tus lecciones completadas.
      Completa el contenido y aprueba los cuestionarios para seguir avanzando.</div>
    {resource.loading ? <Loading /> : resource.error ? <ErrorAlert message={resource.error} retry={resource.reload} /> :
      resource.data.data.length === 0 ? <EmptyState title="Todavía no te inscribiste en un curso">
        <Link to="/cursos">Explorar el catálogo</Link>
      </EmptyState> : <>
        <div className="row g-4">{resource.data.data.map(({ id, curso, fechaInscripcion, progreso }) =>
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
                <div className="mb-3">
                  <p className="small mb-2">{progreso.completadas} de {progreso.total} lecciones · {progreso.porcentaje} %</p>
                  <ProgressBar value={progreso.porcentaje} label={`Progreso de ${curso.titulo}`} />
                  <p className={`small mt-2 mb-0 ${progreso.completado ? "text-success fw-semibold" : "text-secondary"}`}>
                    {progreso.completado ? "Completado" : progreso.completadas > 0 ? "En curso" : "Sin empezar"}
                  </p>
                </div>
                {curso.estado === "archivado" ? <div className="stage-notice">
                  Este curso fue archivado. Tu inscripción se conserva.
                </div> : <div className="course-card-footer">
                  <span className="level-label">{levelLabels[curso.nivel]}</span>
                  <Link className="course-link" to={`/cursos/${curso.id}`}>Ver temario ↗</Link>
                </div>}
                <Link className="btn btn-primary w-100 mt-3" to={`/aprender/${curso.id}`}>
                  {progreso.total === 0 ? "Ver aula" : progreso.completado ? "Repasar curso" :
                    progreso.completadas > 0 ? "Continuar" : "Empezar"} →
                </Link>
              </div>
            </article>
          </div>)}</div>
        <Pagination pagination={resource.data.pagination} onChange={(next) => setParams({ page: String(next) })} />
      </>}
  </section>;
}
