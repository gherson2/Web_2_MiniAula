import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { AuthContext, AuthProvider } from "../context/AuthContext";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { CourseForm } from "../components/CourseForm";
import { LessonForm } from "../components/LessonForm";
import { CatalogPage } from "../pages/CatalogPage";
import { AuthPage } from "../pages/AuthPage";
import { useAuth } from "../hooks/useAuth";
import { CourseService } from "../services/CourseService";
import { AuthService } from "../services/AuthService";
import { saveSession, readSession } from "../services/session";
import { api } from "../services/api";

vi.mock("../services/CourseService", () => ({ CourseService: {
  catalog: vi.fn(), categories: vi.fn(), mine: vi.fn(), addLesson: vi.fn(), updateLesson: vi.fn(),
} }));
vi.mock("../services/AuthService", () => ({ AuthService: {
  me: vi.fn(), login: vi.fn(), register: vi.fn(), update: vi.fn(),
} }));

function wrap(ui, auth = { user: null, loading: false }) {
  return render(<MemoryRouter><AuthContext.Provider value={auth}>{ui}</AuthContext.Provider></MemoryRouter>);
}
function Identity() {
  const { user, logout, loading } = useAuth();
  if (loading) return <span>Validando sesión</span>;
  return <><span>{user?.nombre || "Sin sesión"}</span><button onClick={logout}>Salir</button></>;
}

describe("sesión y rutas protegidas", () => {
  it("redirige al login cuando no hay sesión", async () => {
    wrap(<Routes><Route element={<ProtectedRoute />}><Route path="/" element={<span>Privado</span>} /></Route>
      <Route path="/login" element={<span>Pantalla de login</span>} /></Routes>);
    expect(await screen.findByText("Pantalla de login")).toBeInTheDocument();
    expect(screen.queryByText("Privado")).not.toBeInTheDocument();
  });
  it("impide que un estudiante acceda al editor del instructor", () => {
    wrap(<Routes><Route element={<ProtectedRoute role="instructor" />}><Route path="/" element={<span>Editor privado</span>} /></Route></Routes>,
      { user: { nombre: "Estudiante", rol: "estudiante" }, loading: false });
    expect(screen.getByText("Esta sección es para instructores")).toBeInTheDocument();
    expect(screen.queryByText("Editor privado")).not.toBeInTheDocument();
  });
  it("restaura la sesión al recargar y permite cerrarla", async () => {
    const usuario = { id: 1, nombre: "Ana", rol: "instructor", email: "ana@test.com" };
    saveSession({ token: "token-prueba", usuario });
    AuthService.me.mockResolvedValue(usuario);
    render(<AuthProvider><Identity /></AuthProvider>);
    expect(await screen.findByText("Ana")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Salir" }));
    expect(screen.getByText("Sin sesión")).toBeInTheDocument();
    expect(readSession()).toBeNull();
  });
  it("un 401 en la instancia HTTP cierra la sesión", async () => {
    const usuario = { id: 1, nombre: "Ana", rol: "instructor" };
    saveSession({ token: "token-prueba", usuario });
    AuthService.me.mockResolvedValue(usuario);
    render(<AuthProvider><Identity /></AuthProvider>);
    await screen.findByText("Ana");
    await api.get("/protected", { adapter: async (config) => {
      expect(config.headers.Authorization).toBe("Bearer token-prueba");
      throw { config, response: { status: 401 } };
    } }).catch(() => {});
    await waitFor(() => expect(screen.getByText("Sin sesión")).toBeInTheDocument());
    expect(readSession()).toBeNull();
  });
});

describe("catálogo", () => {
  it("muestra carga y luego un estado vacío", async () => {
    CourseService.categories.mockResolvedValue([]);
    let resolve;
    CourseService.catalog.mockReturnValue(new Promise((done) => { resolve = done; }));
    wrap(<CatalogPage />);
    expect(screen.getByText("Cargando…")).toBeInTheDocument();
    await waitFor(() => expect(CourseService.catalog).toHaveBeenCalled());
    resolve({ data: [], pagination: { total: 0, page: 1, limit: 6, pages: 0 } });
    expect(await screen.findByText("No encontramos cursos")).toBeInTheDocument();
  });
  it("muestra los errores de la API y permite reintentar", async () => {
    CourseService.categories.mockResolvedValue([]);
    CourseService.catalog.mockRejectedValueOnce({ response: { status: 500, data: { error: { message: "Error de prueba" } } } })
      .mockResolvedValue({ data: [], pagination: { total: 0, page: 1, limit: 6, pages: 0 } });
    wrap(<CatalogPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Error de prueba");
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(await screen.findByText("No encontramos cursos")).toBeInTheDocument();
  });
  it("envía búsqueda y categoría a la capa de servicios", async () => {
    CourseService.categories.mockResolvedValue(["Diseño"]);
    CourseService.catalog.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, limit: 6, pages: 0 } });
    wrap(<CatalogPage />);
    await screen.findByText("No encontramos cursos");
    await userEvent.type(screen.getByLabelText("Buscar cursos por título"), "React");
    await userEvent.click(screen.getByRole("button", { name: /Buscar/ }));
    await waitFor(() => expect(CourseService.catalog).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "React", page: 1 }), expect.any(AbortSignal)));
    await userEvent.selectOptions(screen.getByLabelText("Categoría"), "Diseño");
    await waitFor(() => expect(CourseService.catalog).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "React", categoria: "Diseño" }), expect.any(AbortSignal)));
  });
});

describe("formularios", () => {
  it("el formulario de curso incluye los campos requeridos", () => {
    render(<CourseForm onSubmit={vi.fn()} />);
    expect(screen.getByLabelText("Título del curso")).toBeRequired();
    expect(screen.getByLabelText("Categoría")).toBeRequired();
    expect(screen.getByLabelText("Descripción")).toBeRequired();
    expect(screen.getByLabelText("Nivel")).toHaveValue("basico");
  });
  it("no guarda una lección sin texto ni video", async () => {
    render(<LessonForm courseId={1} onSaved={vi.fn()} onCancel={vi.fn()} />);
    await userEvent.type(screen.getByLabelText("Título de la lección"), "Introducción");
    await userEvent.click(screen.getByRole("button", { name: "Guardar lección" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Escribe contenido o agrega un enlace a video.");
    expect(CourseService.addLesson).not.toHaveBeenCalled();
  });
  it("muestra el error de credenciales de la API", async () => {
    AuthService.login.mockRejectedValue({ response: { status: 401, data: { error: { message: "Email o contraseña incorrectos." } } } });
    wrap(<AuthPage />);
    await userEvent.type(screen.getByLabelText("Correo electrónico"), "ana@test.com");
    await userEvent.type(screen.getByLabelText("Contraseña"), "incorrecta");
    await userEvent.click(screen.getByRole("button", { name: /Iniciar sesión/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email o contraseña incorrectos.");
  });
});
