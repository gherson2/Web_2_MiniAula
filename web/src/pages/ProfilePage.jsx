import { useCallback, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useResource } from "../hooks/useResource";
import { AuthService } from "../services/AuthService";
import { errorMessage } from "../services/api";
import { ErrorAlert, Field, Loading } from "../components/Feedback";

function ProfileForm({ user }) {
  const { updateUser } = useAuth();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true); setError(""); setSuccess(false);
    try {
      const result = await AuthService.update(values);
      updateUser(result); setSuccess(true);
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }
  return <div className="profile-panel">
    <div className="profile-summary"><span className="avatar avatar-lg">{user.nombre[0]}</span><h2 className="h4">{user.nombre}</h2>
      <span className="status-badge">{user.rol === "instructor" ? "Instructor" : "Estudiante"}</span></div>
    <form onSubmit={submit}>
      <ErrorAlert message={error} />
      {success && <div className="alert alert-success" role="status">Tu perfil se actualizó correctamente.</div>}
      <fieldset disabled={busy}>
        <Field label="Nombre completo" name="nombre" defaultValue={user.nombre} required maxLength={100} autoComplete="name" />
        <Field label="Correo electrónico" name="email" type="email" defaultValue={user.email} required maxLength={255} autoComplete="email" />
        <p className="small text-secondary">El rol se define al registrarte y no puede cambiarse desde el perfil.</p>
        <button className="btn btn-primary" type="submit">{busy ? "Guardando…" : "Guardar cambios"}</button>
      </fieldset>
    </form>
  </div>;
}
export function ProfilePage() {
  const resource = useResource(useCallback((signal) => AuthService.me(signal), []));
  return <section className="profile-page">
    <span className="eyebrow">TU CUENTA</span><h1 className="mb-4">Mi perfil</h1>
    {resource.loading ? <Loading /> : resource.error ? <ErrorAlert message={resource.error} retry={resource.reload} /> :
      <ProfileForm user={resource.data} />}
  </section>;
}
