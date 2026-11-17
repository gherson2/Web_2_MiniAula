import { Link } from "react-router-dom";

export const levelLabels = { basico: "Básico", intermedio: "Intermedio", avanzado: "Avanzado" };
export const stateLabels = { borrador: "Borrador", publicado: "Publicado", archivado: "Archivado" };
export function CourseArt({ course }) {
  const design = course.categoria.toLowerCase().includes("dise");
  return <div className={`course-art ${design ? "art-design" : "art-code"}`} aria-hidden="true">
    <span className="art-orbit" /><span className="art-code-symbol">{design ? "Aa" : "</>"}</span>
    <span className="art-label">{course.categoria}</span>
  </div>;
}
export function CourseCard({ course, editable = false }) {
  return <article className="course-card">
    <CourseArt course={course} />
    <div className="course-card-body">
      <div className="d-flex justify-content-between gap-2 mb-3">
        <span className="category-label">{course.categoria}</span>
        {editable && <span className={`status-badge status-${course.estado}`}>{stateLabels[course.estado]}</span>}
      </div>
      <h2 className="h5"><Link to={editable ? `/instructor/cursos/${course.id}/editar` : `/cursos/${course.id}`}>{course.titulo}</Link></h2>
      <p className="course-description">{course.descripcion}</p>
      <div className="instructor-line"><span className="avatar avatar-sm">{course.instructor?.nombre?.[0] || "I"}</span>{course.instructor?.nombre || "Instructor"}</div>
      <div className="course-card-footer">
        <span className="level-label">{levelLabels[course.nivel] || course.nivel}</span>
        <Link className="course-link" to={editable ? `/instructor/cursos/${course.id}/editar` : `/cursos/${course.id}`}>{editable ? "Editar curso" : "Ver curso"} <span aria-hidden="true">↗</span></Link>
      </div>
    </div>
  </article>;
}
