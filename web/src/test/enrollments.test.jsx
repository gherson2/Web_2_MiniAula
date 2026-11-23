import { it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { EnrollmentPanel } from "../components/EnrollmentPanel";
import { MyCoursesPage } from "../pages/MyCoursesPage";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AuthContext } from "../context/AuthContext";
import { EnrollmentService } from "../services/EnrollmentService";

vi.mock("../services/EnrollmentService", () => ({ EnrollmentService: {
  mine: vi.fn(), enroll: vi.fn(),
} }));
const result = (data = [], total = data.length) => ({
  data, pagination: { page: 1, limit: 6, total, pages: Math.ceil(total / 6) },
});
const enrollment = {
  id: 10, fechaInscripcion: "2026-11-21T10:00:00Z", cursoId: 1,
  progreso: { completadas: 0, total: 5, porcentaje: 0, completado: false },
  curso: { id: 1, titulo: "Node.js desde cero", categoria: "Programación",
    nivel: "basico", estado: "publicado", instructor: { nombre: "Ana Pérez" } },
};
const wrap = (component) => render(<MemoryRouter>{component}</MemoryRouter>);

it("inscripción: carga el estado y guarda una inscripción desde el botón", async () => {
  EnrollmentService.mine.mockResolvedValueOnce(result()).mockResolvedValue(result([enrollment]));
  EnrollmentService.enroll.mockResolvedValue({ id: 10, cursoId: 1 });
  wrap(<EnrollmentPanel courseId={1} />);
  expect(screen.getByText("Cargando…")).toBeInTheDocument();
  await userEvent.click(await screen.findByRole("button", { name: "Inscribirme en este curso" }));
  expect(await screen.findByText("Tu inscripción se guardó correctamente.")).toBeInTheDocument();
  expect(EnrollmentService.enroll).toHaveBeenCalledExactlyOnceWith(1);
  expect(screen.getByRole("link", { name: /Ver mis cursos/ })).toHaveAttribute("href", "/mis-cursos");
  expect(screen.queryByRole("button", { name: "Inscribirme en este curso" })).not.toBeInTheDocument();
});

it("inscripción: al recargar una inscripción existente no vuelve a ofrecer el botón", async () => {
  EnrollmentService.mine.mockResolvedValue(result([enrollment]));
  wrap(<EnrollmentPanel courseId={1} />);
  expect(await screen.findByText("Ya estás inscrito en este curso.")).toBeInTheDocument();
  expect(EnrollmentService.enroll).not.toHaveBeenCalled();
  expect(EnrollmentService.mine).toHaveBeenCalledWith(
    { cursoId: 1, page: 1, limit: 1 }, expect.any(AbortSignal));
});

it("inscripción: muestra errores de la API y permite volver a intentarlo", async () => {
  EnrollmentService.mine.mockResolvedValue(result());
  EnrollmentService.enroll.mockRejectedValue({ response: { status: 500,
    data: { error: { message: "No se pudo guardar la inscripción." } } } });
  wrap(<EnrollmentPanel courseId={1} />);
  await userEvent.click(await screen.findByRole("button", { name: "Inscribirme en este curso" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar la inscripción.");
  expect(screen.getByRole("button", { name: "Inscribirme en este curso" })).toBeEnabled();
});

it("inscripción: un conflicto 409 actualiza el estado sin duplicar el registro", async () => {
  EnrollmentService.mine.mockResolvedValueOnce(result()).mockResolvedValue(result([enrollment]));
  EnrollmentService.enroll.mockRejectedValue({ response: { status: 409,
    data: { error: { message: "Ya estás inscrito en este curso." } } } });
  wrap(<EnrollmentPanel courseId={1} />);
  await userEvent.click(await screen.findByRole("button", { name: "Inscribirme en este curso" }));
  expect(await screen.findByRole("link", { name: /Ver mis cursos/ })).toBeInTheDocument();
  expect(EnrollmentService.enroll).toHaveBeenCalledTimes(1);
});

it("mis cursos: muestra un estado vacío con enlace al catálogo", async () => {
  EnrollmentService.mine.mockResolvedValue(result());
  wrap(<MyCoursesPage />);
  expect(await screen.findByText("Todavía no te inscribiste en un curso")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Explorar el catálogo" })).toHaveAttribute("href", "/cursos");
});

it("mis cursos: maneja errores y reintento", async () => {
  EnrollmentService.mine.mockRejectedValueOnce({ response: { status: 500,
    data: { error: { message: "No se pudo cargar tu lista." } } } }).mockResolvedValue(result());
  wrap(<MyCoursesPage />);
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo cargar tu lista.");
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("Todavía no te inscribiste en un curso")).toBeInTheDocument();
});

it("mis cursos: conserva cursos archivados sin enlazar a un detalle público inexistente", async () => {
  EnrollmentService.mine.mockResolvedValue(result([
    { ...enrollment, curso: { ...enrollment.curso, estado: "archivado" } },
  ]));
  wrap(<MyCoursesPage />);
  expect(await screen.findByRole("heading", { name: "Node.js desde cero" })).toBeInTheDocument();
  expect(screen.getByText("Este curso fue archivado. Tu inscripción se conserva.")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Ver temario/ })).not.toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  expect(screen.getByRole("link", { name: /Empezar/ })).toHaveAttribute("href", "/aprender/1");
});

it("mis cursos: pagina a través de la capa de servicios", async () => {
  EnrollmentService.mine.mockResolvedValue(result([enrollment], 8));
  wrap(<MyCoursesPage />);
  await userEvent.click(await screen.findByRole("button", { name: /Siguiente/ }));
  await waitFor(() => expect(EnrollmentService.mine).toHaveBeenLastCalledWith(
    { page: 2, limit: 6 }, expect.any(AbortSignal)));
});

it("mis cursos del estudiante: un instructor no puede entrar", () => {
  render(<MemoryRouter><AuthContext.Provider value={{
    user: { id: 1, nombre: "Ana", rol: "instructor" }, loading: false,
  }}>
    <Routes><Route element={<ProtectedRoute role="estudiante" />}>
      <Route path="/" element={<MyCoursesPage />} />
    </Route></Routes>
  </AuthContext.Provider></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Esta sección es para estudiantes" })).toBeInTheDocument();
  expect(EnrollmentService.mine).not.toHaveBeenCalled();
});

it("mis cursos: muestra progreso inicial y acción para empezar", async () => {
  EnrollmentService.mine.mockResolvedValue(result([enrollment]));
  wrap(<MyCoursesPage />);
  expect(await screen.findByText("0 de 5 lecciones · 0 %")).toBeInTheDocument();
  expect(screen.getByRole("progressbar", { name: "Progreso de Node.js desde cero" }))
    .toHaveAttribute("aria-valuenow", "0");
  expect(screen.getByText("Sin empezar")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Empezar/ })).toHaveAttribute("href", "/aprender/1");
});

it("mis cursos: muestra progreso parcial y permite continuar", async () => {
  EnrollmentService.mine.mockResolvedValue(result([{
    ...enrollment, progreso: { completadas: 2, total: 5, porcentaje: 40, completado: false },
  }]));
  wrap(<MyCoursesPage />);
  expect(await screen.findByText("2 de 5 lecciones · 40 %")).toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
  expect(screen.getByText("En curso")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Continuar/ })).toHaveAttribute("href", "/aprender/1");
});

it("mis cursos: permite repasar un curso completado incluso si fue archivado", async () => {
  EnrollmentService.mine.mockResolvedValue(result([{
    ...enrollment, curso: { ...enrollment.curso, estado: "archivado" },
    progreso: { completadas: 5, total: 5, porcentaje: 100, completado: true },
  }]));
  wrap(<MyCoursesPage />);
  expect(await screen.findByText("5 de 5 lecciones · 100 %")).toBeInTheDocument();
  expect(screen.getByText("Completado")).toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
  expect(screen.getByRole("link", { name: /Repasar curso/ })).toHaveAttribute("href", "/aprender/1");
  expect(screen.queryByRole("link", { name: /Ver temario/ })).not.toBeInTheDocument();
});

it("mis cursos: cada barra corresponde a su propio curso", async () => {
  EnrollmentService.mine.mockResolvedValue(result([
    enrollment,
    { ...enrollment, id: 11, curso: { ...enrollment.curso, id: 2, titulo: "Diseño de interfaces" },
      progreso: { completadas: 1, total: 2, porcentaje: 50, completado: false } },
  ]));
  wrap(<MyCoursesPage />);
  expect(await screen.findByRole("progressbar", { name: "Progreso de Node.js desde cero" }))
    .toHaveAttribute("aria-valuenow", "0");
  expect(screen.getByRole("progressbar", { name: "Progreso de Diseño de interfaces" }))
    .toHaveAttribute("aria-valuenow", "50");
});

it("mis cursos: un curso sin lecciones no aparece como completado", async () => {
  EnrollmentService.mine.mockResolvedValue(result([{
    ...enrollment, progreso: { completadas: 0, total: 0, porcentaje: 0, completado: false },
  }]));
  wrap(<MyCoursesPage />);
  expect(await screen.findByText("0 de 0 lecciones · 0 %")).toBeInTheDocument();
  expect(screen.queryByText("Completado")).not.toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Ver aula/ })).toBeInTheDocument();
});
