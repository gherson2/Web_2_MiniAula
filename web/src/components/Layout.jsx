import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  function leave() {
    logout();
    navigate("/login");
  }
  return <>
    <header className="site-header">
      <nav className="container app-nav" aria-label="Navegación principal">
        <Link to="/cursos" className="brand"><span className="brand-icon">m<span>↗</span></span>MiniAula<span className="brand-dot">.</span></Link>
        <div className="nav-links">
          <NavLink to="/cursos">Explorar cursos</NavLink>
          {user?.rol === "instructor" && <NavLink to="/instructor/cursos">Mis cursos</NavLink>}
        </div>
        <div className="nav-account">
          {user ? <>
            <NavLink className="profile-link" to="/perfil"><span className="avatar">{user.nombre[0]}</span><span>{user.nombre.split(" ")[0]}</span></NavLink>
            <button className="btn btn-sm btn-outline-secondary" onClick={leave}>Salir</button>
          </> : <>
            <Link className="login-link" to="/login">Ingresar</Link>
            <Link className="btn btn-primary btn-sm" to="/registro">Crear cuenta</Link>
          </>}
        </div>
      </nav>
    </header>
    <main className="container page-main"><Outlet /></main>
    <footer className="site-footer container"><span>MiniAula · Pequeños pasos, grandes aprendizajes.</span>
      <span className="stage-badge">Primera etapa · v0.4</span></footer>
  </>;
}
