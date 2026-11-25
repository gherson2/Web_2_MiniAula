import { beforeEach, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LearningPage } from "../pages/LearningPage";
import { InstructorSummaryPage } from "../pages/InstructorSummaryPage";
import { LearningService } from "../services/LearningService";
import { CourseService } from "../services/CourseService";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AuthContext } from "../context/AuthContext";

vi.mock("../services/LearningService", () => ({ LearningService: {
  progress: vi.fn(), lesson: vi.fn(), attempt: vi.fn(),
} }));
vi.mock("../services/CourseService", () => ({ CourseService: { summary: vi.fn() } }));
const quiz = {
  id: 11, titulo: "Evaluación", tipo: "cuestionario", orden: 1, notaMinima: 70,
  preguntas: [{ id: 31, enunciado: "¿Qué método crea?", opciones: ["GET", "POST"] }],
};
const initial = {
  curso: { id: 1, titulo: "Curso", estado: "publicado" }, completadas: 0, total: 2, porcentaje: 0, completado: false,
  lecciones: [
    { ...quiz, preguntas: undefined, bloqueada: false, completada: false, intentos: 0, intentosRestantes: 3, mejorNota: null },
    { id: 12, titulo: "Final", tipo: "contenido", orden: 2, bloqueada: true, completada: false },
  ],
};
function progress(attempts, passed = false) {
  return { ...initial, completadas: passed ? 1 : 0, porcentaje: passed ? 50 : 0,
    lecciones: [
      { ...initial.lecciones[0], intentos: attempts, intentosRestantes: 3 - attempts,
        mejorNota: passed ? 100 : 0, completada: passed },
      { ...initial.lecciones[1], bloqueada: !passed },
    ] };
}
function classroom() {
  return render(<MemoryRouter initialEntries={["/aprender/1"]}>
    <Routes><Route path="/aprender/:id" element={<LearningPage />} /></Routes>
  </MemoryRouter>);
}
function panel() {
  return render(<MemoryRouter initialEntries={["/instructor/cursos/1/resumen"]}>
    <Routes><Route path="/instructor/cursos/:id/resumen" element={<InstructorSummaryPage />} /></Routes>
  </MemoryRouter>);
}
const stats = {
  curso: { id: 1, titulo: "Curso" }, inscritos: 2, completados: 0, progresoPromedio: 25,
  notaPromedio: 100, cuestionariosIntentados: 1,
  detenciones: [{ id: 11, titulo: "Evaluación", estudiantes: 1 }, { id: 12, titulo: "Final", estudiantes: 1 }],
};
beforeEach(() => {
  LearningService.progress.mockReset().mockResolvedValue(initial);
  LearningService.lesson.mockReset().mockResolvedValue(quiz);
  LearningService.attempt.mockReset();
  CourseService.summary.mockReset().mockResolvedValue(stats);
});

it("rendir: envía solo respuestas y conserva el bloqueo al reprobar", async () => {
  LearningService.attempt.mockResolvedValue({
    nota: 0, aprobado: false, mejorNota: 0, intentos: 1, intentosRestantes: 2, progreso: progress(1),
  });
  classroom();
  await userEvent.click(await screen.findByRole("radio", { name: "GET" }));
  await userEvent.click(screen.getByRole("button", { name: "Enviar respuestas" }));
  expect(await screen.findByText(/No alcanzaste la nota mínima/)).toBeInTheDocument();
  expect(LearningService.attempt).toHaveBeenCalledExactlyOnceWith(11, [{ preguntaId: 31, indiceElegido: 0 }]);
  expect(screen.getByRole("button", { name: "Final: bloqueada" })).toBeDisabled();
  expect(screen.getByText(/Intentos utilizados: 1 \/ 3/)).toBeInTheDocument();
});

it("rendir: al aprobar actualiza la mejor nota y desbloquea la siguiente", async () => {
  LearningService.attempt.mockResolvedValue({
    nota: 100, aprobado: true, mejorNota: 100, intentos: 2, intentosRestantes: 1, progreso: progress(2, true),
  });
  classroom();
  await userEvent.click(await screen.findByRole("radio", { name: "POST" }));
  await userEvent.click(screen.getByRole("button", { name: "Enviar respuestas" }));
  expect(await screen.findByText("Cuestionario aprobado.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Abrir Final" })).toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "50");
  expect(screen.getByText("Mejor nota: 100 / 100")).toBeInTheDocument();
});

it("rendir: recargar con tres intentos no permite un cuarto envío", async () => {
  LearningService.progress.mockResolvedValue(progress(3));
  classroom();
  expect(await screen.findByText("Ya utilizaste los tres intentos.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Enviar respuestas" })).not.toBeInTheDocument();
  expect(LearningService.attempt).not.toHaveBeenCalled();
});

it("rendir: no envía un formulario incompleto", async () => {
  classroom();
  await userEvent.click(await screen.findByRole("button", { name: "Enviar respuestas" }));
  expect(LearningService.attempt).not.toHaveBeenCalled();
});

it("rendir: un error no consume intentos en pantalla y conserva la respuesta", async () => {
  LearningService.attempt.mockRejectedValue({ response: { data: { error: { message: "No se pudo guardar." } } } });
  classroom();
  await userEvent.click(await screen.findByRole("radio", { name: "POST" }));
  await userEvent.click(screen.getByRole("button", { name: "Enviar respuestas" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar.");
  expect(screen.getByRole("radio", { name: "POST" })).toBeChecked();
  expect(screen.getByText(/Intentos utilizados: 0 \/ 3/)).toBeInTheDocument();
});

it("rendir: deshabilita el formulario durante la calificación", async () => {
  let done;
  LearningService.attempt.mockReturnValue(new Promise((resolve) => { done = resolve; }));
  classroom();
  await userEvent.click(await screen.findByRole("radio", { name: "POST" }));
  await userEvent.click(screen.getByRole("button", { name: "Enviar respuestas" }));
  expect(screen.getByRole("button", { name: "Calificando…" })).toBeDisabled();
  await userEvent.click(screen.getByRole("button", { name: "Calificando…" }));
  expect(LearningService.attempt).toHaveBeenCalledTimes(1);
  done({ nota: 100, aprobado: true, intentosRestantes: 2, progreso: progress(1, true) });
  expect(await screen.findByText("Cuestionario aprobado.")).toBeInTheDocument();
});

it("panel: muestra agregados y permite actualizar", async () => {
  panel();
  expect(await screen.findByText("25 %")).toBeInTheDocument();
  expect(screen.getByText("100 / 100")).toBeInTheDocument();
  expect(screen.getByText("Evaluación")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Actualizar estadísticas" }));
  await waitFor(() => expect(CourseService.summary).toHaveBeenCalledTimes(2));
});

it("panel: distingue cero estudiantes y ninguna nota", async () => {
  CourseService.summary.mockResolvedValue({ ...stats, inscritos: 0, notaPromedio: null, detenciones: [] });
  panel();
  expect(await screen.findByText("Sin intentos")).toBeInTheDocument();
  expect(screen.getByText("Todavía no hay estudiantes inscritos.")).toBeInTheDocument();
  expect(screen.getByText("Este curso todavía no tiene lecciones.")).toBeInTheDocument();
});

it("panel: muestra rechazo de propiedad y reintenta", async () => {
  CourseService.summary.mockRejectedValueOnce({ response: { data: { error: { message: "Solo tus propios cursos." } } } });
  panel();
  expect(await screen.findByRole("alert")).toHaveTextContent("Solo tus propios cursos.");
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("25 %")).toBeInTheDocument();
});

it("panel: protege la ruta del instructor", () => {
  render(<MemoryRouter initialEntries={["/instructor/cursos/1/resumen"]}>
    <AuthContext.Provider value={{ user: { rol: "estudiante" }, loading: false }}>
      <Routes><Route element={<ProtectedRoute role="instructor" />}>
        <Route path="/instructor/cursos/:id/resumen" element={<InstructorSummaryPage />} />
      </Route></Routes>
    </AuthContext.Provider>
  </MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Esta sección es para instructores" })).toBeInTheDocument();
  expect(CourseService.summary).not.toHaveBeenCalled();
});
