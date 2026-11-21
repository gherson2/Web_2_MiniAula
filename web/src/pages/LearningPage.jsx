import { useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { LearningService } from "../services/LearningService";
import { useResource } from "../hooks/useResource";
import { Loading, ErrorAlert, EmptyState } from "../components/Feedback";

function videoLink(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function LessonViewer({ lessonId }) {
  const resource = useResource(useCallback((signal) => LearningService.lesson(lessonId, signal), [lessonId]));
  if (resource.loading) return <Loading />;
  if (resource.error) return <ErrorAlert message={resource.error} retry={resource.reload} />;
  const lesson = resource.data;
  const video = videoLink(lesson.videoUrl);
  return <article className="surface-panel lesson-reader" aria-labelledby="lesson-heading">
    <span className="eyebrow">LECCIÓN {lesson.orden} · {lesson.tipo === "contenido" ? "CONTENIDO" : "CUESTIONARIO"}</span>
    <h2 id="lesson-heading" className="h3 mb-4">{lesson.titulo}</h2>
    {lesson.tipo === "cuestionario" ? <div className="stage-notice">
      Este es un cuestionario. La opción para rendirlo y recibir una nota se implementará en la siguiente etapa.
    </div> : <>
      {video && <a className="btn btn-outline-primary mb-4" href={video} target="_blank" rel="noopener noreferrer">Abrir enlace del video ↗</a>}
      {lesson.contenido ? <div className="lesson-content">{lesson.contenido}</div> :
        <p className="text-secondary">Esta lección utiliza el enlace de video como material de estudio.</p>}
    </>}
    <div className="stage-notice mt-4">Ya puedes consultar el contenido desbloqueado.
      Marcar lecciones como completadas y continuar con el avance se añadirá en la siguiente etapa.</div>
  </article>;
}

export function LearningPage() {
  const { id, lessonId } = useParams();
  const resource = useResource(useCallback((signal) => LearningService.progress(id, signal), [id]));
  if (resource.loading) return <Loading />;
  if (resource.error) return <>
    <Link className="back-link" to="/mis-cursos">← Mis cursos</Link>
    <ErrorAlert message={resource.error} retry={resource.reload} />
  </>;
  const { curso, lecciones } = resource.data;
  const first = lecciones.find((lesson) => !lesson.bloqueada && !lesson.completada) ||
    lecciones.find((lesson) => !lesson.bloqueada);
  const selectedId = lessonId || (first ? String(first.id) : null);
  const selected = lecciones.find((lesson) => String(lesson.id) === selectedId);
  return <>
    <Link className="back-link" to="/mis-cursos">← Mis cursos</Link>
    <div className="learning-header mb-4"><span className="eyebrow">AULA DEL ESTUDIANTE</span>
      <h1>{curso.titulo}</h1></div>
    {curso.estado === "archivado" && <div className="stage-notice mb-4">
      El curso fue archivado. Conservas tu inscripción y acceso a las lecciones desbloqueadas.
    </div>}
    {!lecciones.length ? <EmptyState title="Este curso todavía no tiene lecciones">No hay contenido disponible.</EmptyState> :
      <div className="row g-4">
        <aside className="col-lg-4"><nav className="surface-panel learning-syllabus" aria-label="Temario del aula">
          <h2 className="h5 mb-3">Temario <span className="text-secondary">({lecciones.length})</span></h2>
          <ol>{lecciones.map((lesson) => {
            const active = String(lesson.id) === selectedId;
            const contents = <><span className="lesson-number">{lesson.orden}</span>
              <span><strong>{lesson.titulo}</strong><small>{lesson.bloqueada ? "Bloqueada" :
                lesson.completada ? "Completada" : active ? "Actual" : "Disponible"}</small></span></>;
            return <li key={lesson.id}>{lesson.bloqueada ?
              <button type="button" className="lesson-menu-item" disabled aria-label={`${lesson.titulo}: bloqueada`}>{contents}</button> :
              <Link className={`lesson-menu-item ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined} aria-label={`Abrir ${lesson.titulo}`}
                to={`/aprender/${id}/lecciones/${lesson.id}`}>{contents}</Link>}
            </li>;
          })}</ol>
          <p className="small text-secondary mt-3 mb-0">Las siguientes lecciones permanecen bloqueadas hasta completar las anteriores.</p>
        </nav></aside>
        <section className="col-lg-8" aria-label="Contenido de la lección">
          {selected ? <LessonViewer key={selectedId} lessonId={selectedId} /> :
            <ErrorAlert message="La lección no pertenece a este curso." />}
        </section>
      </div>}
  </>;
}
