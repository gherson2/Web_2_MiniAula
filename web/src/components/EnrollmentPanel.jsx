import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { EnrollmentService } from "../services/EnrollmentService";
import { errorMessage } from "../services/api";
import { useResource } from "../hooks/useResource";
import { Loading, ErrorAlert } from "./Feedback";

export function EnrollmentPanel({ courseId }) {
  const resource = useResource(useCallback((signal) =>
    EnrollmentService.mine({ cursoId: courseId, page: 1, limit: 1 }, signal), [courseId]));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function enroll() {
    setBusy(true); setError(""); setSuccess(false);
    try {
      await EnrollmentService.enroll(courseId);
      setSuccess(true);
      resource.reload();
    } catch (err) {
      setError(errorMessage(err));
      // Otra pestaña pudo inscribir al usuario mientras esta estaba abierta.
      if (err.response?.status === 409) resource.reload();
    } finally { setBusy(false); }
  }
  if (resource.loading) return <Loading />;
  if (resource.error) return <ErrorAlert message={resource.error} retry={resource.reload} />;
  const enrolled = resource.data.data.length > 0;
  return <div className="mt-3">
    <ErrorAlert message={error} />
    {enrolled ? <>
      <div className="alert alert-success" role="status">
        {success ? "Tu inscripción se guardó correctamente." : "Ya estás inscrito en este curso."}
      </div>
      <Link className="btn btn-primary w-100" to="/mis-cursos">Ver mis cursos →</Link>
    </> : <button className="btn btn-primary w-100" disabled={busy} onClick={enroll}>
      {busy ? "Guardando inscripción…" : "Inscribirme en este curso"}
    </button>}
  </div>;
}
