import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CourseService } from "../services/CourseService";
import { errorMessage } from "../services/api";
import { useResource } from "../hooks/useResource";
import { CourseForm } from "../components/CourseForm";
import { LessonForm } from "../components/LessonForm";
import { stateLabels } from "../components/CourseCard";
import { ErrorAlert, Loading, EmptyState } from "../components/Feedback";

export function NewCoursePage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError("");
    try {
      const course = await CourseService.create(data);
      navigate(`/instructor/cursos/${course.id}/editar`, { replace: true });
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <section className="new-course-page">
    <Link className="back-link" to="/instructor/cursos">← Mis cursos</Link>
    <span className="eyebrow d-block">DE UNA IDEA A UN CURSO</span><h1>Crea algo que valga la pena aprender.</h1>
    <p className="text-secondary mb-4">Tu curso empezará como borrador. Agrega lecciones antes de publicarlo.</p>
    <div className="surface-panel"><ErrorAlert message={error} /><CourseForm onSubmit={submit} busy={busy} /></div>
  </section>;
}

export function CourseEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const resource = useResource(useCallback((signal) => CourseService.editDetail(id, signal), [id]));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editingLesson, setEditingLesson] = useState(null);
  const course = resource.data;

  async function run(action, success, shouldReload = true) {
    setBusy(true); setError(""); setMessage("");
    try {
      await action();
      setMessage(success);
      if (shouldReload) resource.reload();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  function saveCourse(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    run(() => CourseService.update(id, data), "Datos del curso guardados.");
  }
  function reorder(index, delta) {
    const ids = course.lecciones.map((lesson) => lesson.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    run(() => CourseService.reorder(id, ids), "Orden de las lecciones actualizado.");
  }
  function removeCourse() {
    if (!window.confirm("¿Eliminar este curso y todas sus lecciones? Esta acción no se puede deshacer.")) return;
    run(async () => { await CourseService.remove(id); navigate("/instructor/cursos"); }, "", false);
  }
  if (resource.loading) return <Loading />;
  if (resource.error) return <ErrorAlert message={resource.error} retry={resource.reload} />;

  return <>
    <Link className="back-link" to="/instructor/cursos">← Mis cursos</Link>
    <div className="editor-header">
      <div><span className="eyebrow">EDITOR DE CURSO</span><h1>{course.titulo}</h1>
        <span className={`status-badge status-${course.estado}`}>{stateLabels[course.estado]}</span></div>
      <div className="d-flex flex-wrap gap-2">
        {course.estado === "publicado" && <Link className="btn btn-outline-secondary" to={`/cursos/${id}`}>Ver página pública ↗</Link>}
        {course.estado !== "publicado" && <button className="btn btn-primary" disabled={busy || editingLesson !== null}
          onClick={() => run(() => CourseService.state(id, "publicado"), "Tu curso ya está publicado.")}>Publicar curso</button>}
        {course.estado !== "archivado" && <button className="btn btn-outline-secondary" disabled={busy || editingLesson !== null}
          onClick={() => run(() => CourseService.state(id, "archivado"), "Curso archivado.")}>Archivar</button>}
      </div>
    </div>
    <ErrorAlert message={error} />
    {message && <div className="alert alert-success" role="status">{message}</div>}
    <div className="row g-4">
      <section className="col-lg-5"><div className="surface-panel">
        <h2 className="h5 mb-4">Información del curso</h2>
        <CourseForm key={course.actualizadoEn} course={course} onSubmit={saveCourse} busy={busy || editingLesson !== null} />
        <hr className="my-4" /><p className="small text-secondary">Los cursos con estudiantes inscritos no pueden eliminarse: deben archivarse.</p>
        <button className="btn btn-outline-danger btn-sm" disabled={busy || editingLesson !== null} onClick={removeCourse}>Eliminar curso</button>
      </div></section>
      <section className="col-lg-7"><div className="surface-panel">
        <div className="section-heading"><h2 className="h5 mb-0">Lecciones <span className="text-secondary">({course.lecciones.length})</span></h2>
          <button className="btn btn-outline-primary btn-sm" disabled={busy || editingLesson !== null} onClick={() => setEditingLesson({})}>+ Agregar</button></div>
        <p className="small text-secondary">Usa las flechas para definir el orden del temario.</p>
        {course.lecciones.length === 0 ? <EmptyState title="Aquí comienza tu curso">Agrega tu primera lección de contenido.</EmptyState> :
          <ol className="editor-lessons">{course.lecciones.map((lesson, index) => <li key={lesson.id}>
            <span className="lesson-number">{index + 1}</span>
            <div className="lesson-title-group"><strong>{lesson.titulo}</strong><small>{lesson.tipo === "contenido" ?
              "Texto y video" : `Cuestionario · Nota mínima: ${lesson.notaMinima}`}</small></div>
            <div className="lesson-actions">
              <button className="btn btn-sm btn-light" aria-label={`Subir ${lesson.titulo}`} disabled={busy || editingLesson !== null || index === 0} onClick={() => reorder(index, -1)}>↑</button>
              <button className="btn btn-sm btn-light" aria-label={`Bajar ${lesson.titulo}`} disabled={busy || editingLesson !== null || index === course.lecciones.length - 1} onClick={() => reorder(index, 1)}>↓</button>
              <button className="btn btn-sm btn-outline-secondary" disabled={busy || editingLesson !== null} onClick={() => setEditingLesson(lesson)}>Editar</button>
              {lesson.tipo === "cuestionario" && <button className="btn btn-sm btn-outline-primary"
                disabled={busy || editingLesson !== null} aria-label={`Preguntas de ${lesson.titulo}`}
                onClick={() => navigate(`/instructor/lecciones/${lesson.id}/preguntas`)}>Preguntas</button>}
              <button className="btn btn-sm btn-outline-danger" aria-label={`Eliminar ${lesson.titulo}`} disabled={busy || editingLesson !== null}
                onClick={() => window.confirm(`¿Eliminar “${lesson.titulo}”?`) && run(() => CourseService.removeLesson(lesson.id), "Lección eliminada.")}>×</button>
            </div>
          </li>)}</ol>}
        {editingLesson !== null && <LessonForm key={editingLesson.id || "new"} courseId={id} lesson={editingLesson}
          onCancel={() => setEditingLesson(null)} onSaved={() => {
            setEditingLesson(null); setError(""); setMessage("Lección guardada."); resource.reload();
          }} />}
      </div></section>
    </div>
  </>;
}
