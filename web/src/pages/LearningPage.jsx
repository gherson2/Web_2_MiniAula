import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { LearningService } from "../services/LearningService";
import { useResource } from "../hooks/useResource";
import { Loading, ErrorAlert, EmptyState } from "../components/Feedback";
import { errorMessage } from "../services/api";

function videoLink(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch { return null; }
}

function LessonViewer({ lessonId, status, nextLesson, courseId, onCompleted }) {
  const resource = useResource(useCallback((signal) => LearningService.lesson(lessonId, signal), [lessonId]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  async function complete() {
    setBusy(true); setError(""); setSuccess(false);
    try {
      const progress = await LearningService.complete(lessonId);
      onCompleted(progress);
      setSuccess(true);
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
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
      <div className="mt-4">
        <ErrorAlert message={error} />
        {success && <div className="alert alert-success" role="status">Lección guardada como completada.</div>}
        {status.completada ? <p className="text-success fw-semibold">Esta lección está completada.</p> :
          <button className="btn btn-primary" disabled={busy} onClick={complete}>
            {busy ? "Guardando progreso…" : "Marcar como completada"}
          </button>}
      </div>
    </>}
    {status.completada && nextLesson && !nextLesson.bloqueada &&
      <Link className="btn btn-outline-primary mt-3" to={`/aprender/${courseId}/lecciones/${nextLesson.id}`}>
        Siguiente lección →
      </Link>}
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
  return <LearningCourse key={id} initialProgress={resource.data} lessonId={lessonId} />;
}

function LearningCourse({ initialProgress, lessonId }) {
  const [progress, setProgress] = useState(initialProgress);
  const { curso, lecciones } = progress;
  // Conservar la lección actual al guardar. El alumno elige cuándo continuar.
  const [initialId] = useState(() => {
    const first = initialProgress.lecciones.find((lesson) => !lesson.bloqueada && !lesson.completada) ||
      initialProgress.lecciones.find((lesson) => !lesson.bloqueada);
    return first ? String(first.id) : null;
  });
  const selectedId = lessonId || initialId;
  const selected = lecciones.find((lesson) => String(lesson.id) === selectedId);
  const nextLesson = lecciones[lecciones.findIndex((lesson) => String(lesson.id) === selectedId) + 1];
  const id = curso.id;
  return <>
    <Link className="back-link" to="/mis-cursos">← Mis cursos</Link>
    <div className="learning-header mb-4"><span className="eyebrow">AULA DEL ESTUDIANTE</span>
      <h1>{curso.titulo}</h1></div>
    {lecciones.length > 0 && <div className="surface-panel p-3 mb-4">
      <p className="mb-2">{progress.completadas} de {progress.total} lecciones · {progress.porcentaje} %</p>
      <div className="progress" role="progressbar" aria-label="Progreso del curso"
        aria-valuenow={progress.porcentaje} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-bar bg-success" style={{ width: `${progress.porcentaje}%` }} />
      </div>
      {progress.completado && <p className="text-success fw-semibold mt-3 mb-0" role="status">
        Completaste todas las lecciones de este curso.
      </p>}
    </div>}
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
          {selected ? <LessonViewer key={selectedId} lessonId={selectedId} status={selected}
            nextLesson={nextLesson} courseId={id} onCompleted={setProgress} /> :
            <ErrorAlert message="La lección no pertenece a este curso." />}
        </section>
      </div>}
  </>;
}
