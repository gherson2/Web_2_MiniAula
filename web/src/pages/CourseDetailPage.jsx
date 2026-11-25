import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { CourseService } from "../services/CourseService";
import { useResource } from "../hooks/useResource";
import { useAuth } from "../hooks/useAuth";
import { CourseArt, levelLabels } from "../components/CourseCard";
import { Loading, ErrorAlert, EmptyState } from "../components/Feedback";
import { EnrollmentPanel } from "../components/EnrollmentPanel";

export function CourseDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { data: course, loading, error, reload } = useResource(useCallback((signal) => CourseService.detail(id, signal), [id]));
  if (loading) return <Loading />;
  if (error) return <ErrorAlert message={error} retry={reload} />;
  return <>
    <Link className="back-link" to="/cursos">← Volver al catálogo</Link>
    <div className="row g-4 g-lg-5 detail-layout">
      <section className="col-lg-7">
        <span className="eyebrow">{course.categoria} · {levelLabels[course.nivel]}</span>
        <h1 className="detail-title">{course.titulo}</h1>
        <p className="detail-description">{course.descripcion}</p>
        <div className="instructor-line mb-5"><span className="avatar">{course.instructor.nombre[0]}</span><span>Un curso de <strong>{course.instructor.nombre}</strong></span></div>
        <div className="section-heading"><h2 className="h4">Lo que vas a aprender</h2><span className="text-secondary small">{course.lecciones.length} lecciones</span></div>
        {!course.lecciones.length ? <EmptyState title="El temario está vacío" /> :
          <ol className="syllabus">{course.lecciones.map((lesson, index) => <li key={lesson.id}>
            <span className="lesson-number">{String(index + 1).padStart(2, "0")}</span>
            <div><h3>{lesson.titulo}</h3><span>{lesson.tipo === "cuestionario" ? `Cuestionario · Nota mínima: ${lesson.notaMinima}` : "Lección de contenido"}</span></div>
            <span className="syllabus-lock" aria-label="Solo temario">○</span>
          </li>)}</ol>}
      </section>
      <aside className="col-lg-5">
        <div className="detail-aside"><CourseArt course={course} />
          <div className="p-4"><h2 className="h5">Un nuevo tema para explorar</h2>
            <p className="text-secondary">Consulta el temario y conoce los temas de este curso.</p>
            <div className="stage-notice">Ya puedes inscribirte y guardar este curso en tu lista.
              Si estás inscrito, puedes leer las lecciones desbloqueadas en el aula.
              También puedes completar el contenido para desbloquear la siguiente lección.
               Aprueba los cuestionarios en el aula con hasta tres intentos por evaluación.</div>
            {user?.rol === "estudiante" && <EnrollmentPanel key={`${user.id}:${course.id}`} courseId={course.id} />}
            {user?.id === course.instructorId && <Link className="btn btn-primary w-100 mt-3" to={`/instructor/cursos/${id}/editar`}>Editar mi curso →</Link>}
            {!user && <Link className="btn btn-outline-primary w-100 mt-3" to="/registro">Crear una cuenta</Link>}
          </div>
        </div>
      </aside>
    </div>
  </>;
}
