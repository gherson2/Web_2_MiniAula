import { useState } from "react";
import { CourseService } from "../services/CourseService";
import { errorMessage } from "../services/api";
import { Field, ErrorAlert } from "./Feedback";

export function LessonForm({ courseId, lesson, onSaved, onCancel }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [type, setType] = useState(lesson?.tipo || "contenido");
  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (type === "contenido" && !data.contenido.trim() && !data.videoUrl.trim()) {
      setError("Escribe contenido o agrega un enlace a video."); return;
    }
    if (type === "cuestionario") {
      data.notaMinima = Number(data.notaMinima);
      if (!Number.isInteger(data.notaMinima) || data.notaMinima < 0 || data.notaMinima > 100) {
        setError("La nota mínima debe ser un entero entre 0 y 100."); return;
      }
    }
    setBusy(true); setError("");
    try {
      if (lesson?.id) await CourseService.updateLesson(lesson.id, data);
      else await CourseService.addLesson(courseId, data);
      onSaved();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <div className="lesson-editor">
    <h3 className="h5">{lesson?.id ? "Editar lección" : "Nueva lección"}</h3>
    <ErrorAlert message={error} />
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        <Field id="lesson-title" label="Título de la lección" name="titulo" defaultValue={lesson?.titulo || ""} required maxLength={150} autoFocus />
        <Field label="Tipo de lección" name="tipo">
          <select className="form-select" id="tipo" name="tipo" value={type}
            disabled={Boolean(lesson?.id)} onChange={(event) => setType(event.target.value)}>
            <option value="contenido">Contenido · Texto y video</option>
            <option value="cuestionario">Cuestionario · Preguntas</option>
          </select>
        </Field>
        {lesson?.id && <input type="hidden" name="tipo" value={type} />}
        {type === "contenido" ? <>
          <Field label="Contenido de texto" name="contenido">
          <textarea className="form-control" id="contenido" name="contenido" rows={6} defaultValue={lesson?.contenido || ""} maxLength={50000} />
          </Field>
          <Field label="Enlace a video (opcional)" name="videoUrl" type="url" placeholder="https://…" defaultValue={lesson?.videoUrl || ""} maxLength={2048} />
        </> : <>
          <Field label="Nota mínima de aprobación" name="notaMinima" type="number"
            defaultValue={lesson?.notaMinima ?? 70} min={0} max={100} step={1} required />
          <p className="small text-secondary">Guarda el cuestionario y usa “Preguntas” en el temario para agregar sus opciones y respuestas.</p>
        </>}
        <div className="d-flex gap-2"><button className="btn btn-primary" type="submit">{busy ? "Guardando…" : "Guardar lección"}</button>
          <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>Cancelar</button></div>
      </fieldset>
    </form>
  </div>;
}
