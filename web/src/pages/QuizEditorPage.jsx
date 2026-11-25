import { useCallback, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { QuestionService } from "../services/QuestionService";
import { errorMessage } from "../services/api";
import { useResource } from "../hooks/useResource";
import { QuestionForm } from "../components/QuestionForm";
import { ErrorAlert, Loading, EmptyState } from "../components/Feedback";
import { Pagination } from "../components/Pagination";

export function QuizEditorPage() {
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const resource = useResource(useCallback((signal) =>
    QuestionService.list(id, { page, limit: 10 }, signal), [id, page]));

  async function remove(question) {
    if (!window.confirm(`¿Eliminar la pregunta “${question.enunciado}”?`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await QuestionService.remove(question.id);
      setMessage("Pregunta eliminada.");
      if (resource.data.data.length === 1 && page > 1) setPage((value) => value - 1);
      else resource.reload();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  if (resource.loading) return <Loading />;
  if (resource.error) return <ErrorAlert message={resource.error} retry={resource.reload} />;
  const { leccion, data, pagination } = resource.data;
  return <>
    <Link className="back-link" to={`/instructor/cursos/${leccion.cursoId}/editar`}>← Volver al editor del curso</Link>
    <span className="eyebrow d-block">EDITOR DE CUESTIONARIO</span>
    <h1 className="detail-title">{leccion.titulo}</h1>
    <p className="text-secondary">Nota mínima: {leccion.notaMinima} / 100 · {pagination.total} {pagination.total === 1 ? "pregunta" : "preguntas"}</p>
    <div className="stage-notice mb-4">Aquí puedes preparar las preguntas y definir su respuesta correcta.
      Las claves nunca se devuelven por la API. Los estudiantes inscritos pueden rendir hasta tres intentos.</div>
    <ErrorAlert message={error} />
    {message && <div className="alert alert-success" role="status">{message}</div>}
    <div className="surface-panel">
      <div className="section-heading">
        <h2 className="h5 mb-0">Preguntas de opción múltiple</h2>
        <button className="btn btn-primary btn-sm" disabled={busy || editing !== null}
          onClick={() => { setEditing({}); setMessage(""); setError(""); }}>+ Agregar pregunta</button>
      </div>
      {!data.length ? <EmptyState title="Todavía no hay preguntas">Agrega la primera pregunta del cuestionario.</EmptyState> :
        <ol className="question-list" start={(pagination.page - 1) * pagination.limit + 1}>
          {data.map((question) => <li key={question.id}>
            <h3 className="h6">{question.enunciado}</h3>
            <ol className="text-secondary small" type="A">{question.opciones.map((option, index) => <li key={index}>{option}</li>)}</ol>
            <div className="d-flex flex-wrap gap-2 mt-3">
              <button className="btn btn-outline-secondary btn-sm" disabled={busy || editing !== null}
                onClick={() => { setEditing(question); setError(""); setMessage(""); }}>Editar pregunta</button>
              <button className="btn btn-outline-danger btn-sm" disabled={busy || editing !== null}
                onClick={() => remove(question)}>Eliminar pregunta</button>
            </div>
          </li>)}
        </ol>}
      {editing !== null && <QuestionForm key={editing.id || "new"} lessonId={id} question={editing}
        onCancel={() => setEditing(null)} onSaved={() => {
          setEditing(null); setMessage("Pregunta guardada."); setError(""); resource.reload();
        }} />}
      {editing === null && <Pagination pagination={pagination} onChange={setPage} />}
    </div>
  </>;
}
