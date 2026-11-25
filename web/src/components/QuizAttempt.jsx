import { useState } from "react";
import { LearningService } from "../services/LearningService";
import { errorMessage } from "../services/api";
import { ErrorAlert } from "./Feedback";

export function QuizAttempt({ lesson, status, onCompleted }) {
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const questions = lesson.preguntas || [];
  const remaining = status.intentosRestantes ?? 3;
  async function submit(event) {
    event.preventDefault();
    if (busy) return;
    if (questions.some((question) => answers[question.id] === undefined)) {
      setError("Responde todas las preguntas antes de enviar."); return;
    }
    setBusy(true); setError(""); setResult(null);
    try {
      const response = await LearningService.attempt(lesson.id, questions.map((question) => ({
        preguntaId: question.id, indiceElegido: answers[question.id],
      })));
      setResult(response); setAnswers({}); onCompleted(response.progreso);
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <section aria-label="Cuestionario">
    <p>Nota mínima: {lesson.notaMinima} / 100 · Intentos utilizados: {status.intentos ?? 0} / 3</p>
    <p>Mejor nota: {status.mejorNota == null ? "Sin intentos" : `${status.mejorNota} / 100`}</p>
    {status.completada && <p className="text-success fw-semibold">Cuestionario aprobado.</p>}
    <ErrorAlert message={error} />
    {result && <div className={`alert ${result.aprobado ? "alert-success" : "alert-warning"}`} role="status">
      Nota del intento: {result.nota} / 100. {result.aprobado ? "Aprobaste este intento." :
        "No alcanzaste la nota mínima."} Intentos restantes: {result.intentosRestantes}.
    </div>}
    {!questions.length ? <p className="stage-notice">El cuestionario todavía no tiene preguntas. Contacta al instructor.</p> :
      remaining <= 0 ? <p className="stage-notice">Ya utilizaste los tres intentos.</p> :
        <form onSubmit={submit}>
          <fieldset disabled={busy}>
            {questions.map((question, index) => <fieldset className="mb-4" key={question.id}>
              <legend className="h6">{index + 1}. {question.enunciado}</legend>
              {question.opciones.map((option, choice) => <label className="form-check mb-2" key={choice}>
                <input className="form-check-input" type="radio" name={`question-${question.id}`} required
                  checked={answers[question.id] === choice}
                  onChange={() => setAnswers((current) => ({ ...current, [question.id]: choice }))} />
                <span className="form-check-label">{option}</span>
              </label>)}
            </fieldset>)}
            <button className="btn btn-primary" type="submit">
              {busy ? "Calificando…" : status.completada ? "Intentar mejorar nota" : "Enviar respuestas"}
            </button>
          </fieldset>
        </form>}
    <p className="small text-secondary mt-3">La nota se calcula en el servidor. Se conserva la mejor nota y la aprobación.
      Cada envío válido consume un intento; recargar la página no los restablece.</p>
  </section>;
}
