import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AuthService } from "../services/AuthService";
import { errorMessage } from "../services/api";
import { ErrorAlert, Field, Loading } from "../components/Feedback";

export function AuthPage({ register = false }) {
  const { user, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (loading) return <Loading />;
  if (user) return <Navigate to={user.rol === "instructor" ? "/instructor/cursos" : "/cursos"} replace />;

  async function submit(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    if (register && (values.password.length < 8 || new TextEncoder().encode(values.password).length > 72)) {
      setError("La contraseña debe tener al menos 8 caracteres y no superar 72 bytes.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await AuthService[register ? "register" : "login"](values);
      signIn(result);
      const destination = location.state?.from;
      navigate(destination?.startsWith("/") && !destination.startsWith("//") ? destination :
        result.usuario.rol === "instructor" ? "/instructor/cursos" : "/cursos", { replace: true });
    } catch (err) { setError(errorMessage(err)); }
    finally { setBusy(false); }
  }

  return <div className="auth-layout">
    <section className="auth-story">
      <span className="eyebrow">TU PRÓXIMO PASO EMPIEZA AQUÍ</span>
      <h1>Aprender algo nuevo<br />puede cambiarlo todo<span>.</span></h1>
      <p>Cursos cortos, ideas claras y un espacio para compartir lo que sabes.</p>
      <div className="story-illustration" aria-hidden="true"><span>01</span><span>Aprende</span><strong>↗</strong></div>
      <small>MiniAula · Ingeniería Web 2</small>
    </section>
    <section className="auth-form-panel">
      <span className="eyebrow">{register ? "SÚMATE A MINIAULA" : "QUÉ BUENO VERTE"}</span>
      <h2>{register ? "Crea tu cuenta" : "Bienvenido de nuevo"}</h2>
      <p className="text-secondary mb-4">{register ? "Elige cómo quieres participar." : "Ingresa para continuar con tus cursos."}</p>
      <ErrorAlert message={error} />
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          {register && <Field label="Nombre completo" name="nombre" required maxLength={100} autoComplete="name" />}
          <Field label="Correo electrónico" name="email" type="email" required maxLength={255} autoComplete="email" />
          <Field label="Contraseña" name="password" type="password" required minLength={register ? 8 : 1} maxLength={72} autoComplete={register ? "new-password" : "current-password"} />
          {register && <Field label="Quiero participar como" name="rol">
            <select className="form-select" id="rol" name="rol" defaultValue="estudiante">
              <option value="estudiante">Estudiante · Quiero aprender</option>
              <option value="instructor">Instructor · Quiero enseñar</option>
            </select>
          </Field>}
          <button className="btn btn-primary w-100 mt-2" type="submit">{busy ? "Un momento…" : register ? "Crear mi cuenta" : "Iniciar sesión"} <span aria-hidden="true">→</span></button>
        </fieldset>
      </form>
      <p className="auth-switch">{register ? "¿Ya tienes una cuenta?" : "¿Es tu primera vez?"} <Link to={register ? "/login" : "/registro"}>{register ? "Inicia sesión" : "Regístrate gratis"}</Link></p>
    </section>
  </div>;
}
