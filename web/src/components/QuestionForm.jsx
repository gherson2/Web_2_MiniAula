import { useState } from "react";
import { QuestionService } from "../services/QuestionService";
import { errorMessage } from "../services/api";
import { ErrorAlert, Field } from "./Feedback";

export function QuestionForm({ lessonId, question, onSaved, onCancel }) {
  const [options, setOptions] = useState(question?.opciones || ["", "", ""]);
  // El servidor nunca devuelve la clave: al editar hay que elegirla nuevamente.
  const [correct, setCorrect] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function changeOption(index, value) {
    setOptions((current) => current.map((item, position) => position === index ? value : item));
  }
  function removeOption(index) {
    setOptions((current) => current.filter((item, position) => position !== index));
    setCorrect("");
  }
  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const normalized = options.map((item) => item.trim());
    if (normalized.some((item) => !item) || correct === "" ||
      new Set(normalized.map((item) => item.toLowerCase())).size !== normalized.length) {
      setError("Completa las opciones sin repetirlas y selecciona una respuesta correcta."); return;
    }
    const data = { enunciado: values.get("enunciado").trim(),
      opciones: normalized, indiceCorrecto: Number(correct) };
    setBusy(true); setError("");
    try {
      if (question?.id) await QuestionService.update(question.id, data);
      else await QuestionService.create(lessonId, data);
      onSaved();
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <section className="lesson-editor" aria-labelledby="question-form-heading">
    <h2 id="question-form-heading" className="h5">{question?.id ? "Editar pregunta" : "Nueva pregunta"}</h2>
    <ErrorAlert message={error} />
    <form onSubmit={submit}>
      <fieldset disabled={busy}>
        <Field label="Enunciado de la pregunta" name="enunciado">
          <textarea className="form-control" id="enunciado" name="enunciado"
            defaultValue={question?.enunciado || ""} required maxLength={2000} rows={3} autoFocus />
        </Field>
        <p className="small text-secondary">Agrega entre 2 y 6 opciones diferentes.</p>
        {options.map((option, index) => <div className="d-flex gap-2 align-items-end mb-3" key={index}>
          <div className="flex-grow-1">
            <label className="form-label" htmlFor={`question-option-${index}`}>Opción {index + 1}</label>
            <input className="form-control" id={`question-option-${index}`} value={option}
              onChange={(event) => changeOption(index, event.target.value)} required maxLength={500} />
          </div>
          <button className="btn btn-outline-danger" type="button" aria-label={`Quitar opción ${index + 1}`}
            disabled={options.length <= 2} onClick={() => removeOption(index)}>×</button>
        </div>)}
        <button className="btn btn-outline-secondary btn-sm mb-3" type="button"
          disabled={options.length >= 6} onClick={() => setOptions((current) => [...current, ""])}>+ Agregar opción</button>
        <Field label="Respuesta correcta" name="indiceCorrecto">
          <select className="form-select" id="indiceCorrecto" value={correct} required
            onChange={(event) => setCorrect(event.target.value)}>
            <option value="">Selecciona una opción</option>
            {options.map((option, index) => <option key={index} value={index}>Opción {index + 1}</option>)}
          </select>
        </Field>
        {question?.id && <p className="stage-notice mb-3">Por seguridad la API no devuelve la respuesta guardada.
          Selecciona nuevamente la opción correcta al editar.</p>}
        <div className="d-flex flex-wrap gap-2">
          <button className="btn btn-primary" type="submit">{busy ? "Guardando…" : "Guardar pregunta"}</button>
          <button className="btn btn-outline-secondary" type="button" onClick={onCancel}>Cancelar</button>
        </div>
      </fieldset>
    </form>
  </section>;
}
