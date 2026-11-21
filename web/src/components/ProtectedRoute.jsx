import { Navigate, Outlet, useLocation, Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Loading } from "./Feedback";

export function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (role && user.rol !== role) return <div className="empty-state">
    <h1 className="h3">{role === "instructor" ? "Esta sección es para instructores" : "Esta sección es para estudiantes"}</h1>
    <p>No tienes permiso para acceder.</p><Link to="/cursos">Volver al catálogo</Link>
  </div>;
  return <Outlet />;
}
