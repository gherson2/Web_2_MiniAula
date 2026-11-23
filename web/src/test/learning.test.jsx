import { beforeEach, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LearningPage } from "../pages/LearningPage";
import { LearningService } from "../services/LearningService";

vi.mock("../services/LearningService", () => ({ LearningService: {
  progress: vi.fn(), lesson: vi.fn(), complete: vi.fn(),
} }));
const summary = {
  curso: { id: 1, titulo: "Node.js desde cero", estado: "publicado" },
  completadas: 0, total: 2, porcentaje: 0, completado: false,
  lecciones: [
    { id: 11, titulo: "Introducción", tipo: "contenido", orden: 1, bloqueada: false, completada: false },
    { id: 12, titulo: "Segunda lección", tipo: "contenido", orden: 2, bloqueada: true, completada: false },
  ],
};
const lesson = {
  id: 11, titulo: "Introducción", tipo: "contenido", orden: 1,
  contenido: "Texto privado de la primera lección.", videoUrl: "https://example.com/video",
};
function wrap(path = "/aprender/1") {
  return render(<MemoryRouter initialEntries={[path]}><Routes>
    <Route path="/aprender/:id" element={<LearningPage />} />
    <Route path="/aprender/:id/lecciones/:lessonId" element={<LearningPage />} />
  </Routes></MemoryRouter>);
}
beforeEach(() => {
  LearningService.progress.mockReset().mockResolvedValue(summary);
  LearningService.lesson.mockReset().mockResolvedValue(lesson);
  LearningService.complete.mockReset();
});

it("aula: muestra carga y luego texto y video de la primera lección", async () => {
  wrap();
  expect(screen.getByText("Cargando…")).toBeInTheDocument();
  expect(await screen.findByText(lesson.contenido)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Abrir enlace del video/ })).toHaveAttribute("href", lesson.videoUrl);
  expect(LearningService.lesson).toHaveBeenCalledWith("11", expect.any(AbortSignal));
});

it("aula: las lecciones bloqueadas están deshabilitadas y no se consulta su contenido", async () => {
  wrap();
  const button = await screen.findByRole("button", { name: "Segunda lección: bloqueada" });
  expect(button).toBeDisabled();
  await userEvent.click(button);
  expect(LearningService.lesson).not.toHaveBeenCalledWith("12", expect.anything());
});

it("aula: una URL directa bloqueada muestra el rechazo 403 del servidor", async () => {
  LearningService.lesson.mockRejectedValue({ response: { status: 403, data: { error: {
    code: "LESSON_LOCKED", message: "Completa las lecciones anteriores para acceder a esta lección.",
  } } } });
  wrap("/aprender/1/lecciones/12");
  expect(await screen.findByRole("alert")).toHaveTextContent("Completa las lecciones anteriores");
  expect(screen.queryByText(lesson.contenido)).not.toBeInTheDocument();
});

it("aula: muestra el error de inscripción y permite reintentar", async () => {
  LearningService.progress.mockRejectedValueOnce({ response: { status: 403, data: { error: {
    message: "Debes inscribirte en este curso para acceder al aula.",
  } } } }).mockResolvedValue(summary);
  wrap();
  expect(await screen.findByRole("alert")).toHaveTextContent("Debes inscribirte");
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText(lesson.contenido)).toBeInTheDocument();
});

it("aula: un temario vacío tiene un estado explícito", async () => {
  LearningService.progress.mockResolvedValue({ ...summary, lecciones: [] });
  wrap();
  expect(await screen.findByText("Este curso todavía no tiene lecciones")).toBeInTheDocument();
  expect(LearningService.lesson).not.toHaveBeenCalled();
});

it("aula: no muestra una lección de otro curso por cambiar la URL", async () => {
  wrap("/aprender/1/lecciones/999");
  expect(await screen.findByRole("alert")).toHaveTextContent("La lección no pertenece a este curso.");
  expect(LearningService.lesson).not.toHaveBeenCalled();
});

it("aula: el texto se escapa y un video con protocolo inseguro no crea un enlace", async () => {
  const text = "<script>alert('no ejecutar')</script>";
  LearningService.lesson.mockResolvedValue({ ...lesson, contenido: text, videoUrl: "javascript:alert(1)" });
  const view = wrap();
  expect(await screen.findByText(text)).toBeInTheDocument();
  expect(view.container.querySelector("script")).toBeNull();
  expect(screen.queryByRole("link", { name: /Abrir enlace del video/ })).not.toBeInTheDocument();
});

it("aula: no ofrece rendir o completar un cuestionario como si fuera contenido", async () => {
  LearningService.lesson.mockResolvedValue({ ...lesson, tipo: "cuestionario" });
  wrap();
  expect(await screen.findByText(/La opción para rendirlo y recibir una nota/)).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Completar|Enviar respuestas|Rendir/ })).not.toBeInTheDocument();
});

it("aula: informa que el curso archivado conserva el acceso del inscrito", async () => {
  LearningService.progress.mockResolvedValue({
    ...summary, curso: { ...summary.curso, estado: "archivado" },
  });
  wrap();
  expect(await screen.findByText(/Conservas tu inscripción y acceso a las lecciones desbloqueadas/)).toBeInTheDocument();
  expect(await screen.findByText(lesson.contenido)).toBeInTheDocument();
});

const savedProgress = {
  ...summary, completadas: 1, porcentaje: 50,
  lecciones: [
    { ...summary.lecciones[0], completada: true },
    { ...summary.lecciones[1], bloqueada: false },
  ],
};

it("completar: guarda en la API y actualiza el temario y la barra con la respuesta del servidor", async () => {
  LearningService.complete.mockResolvedValue(savedProgress);
  wrap();
  await userEvent.click(await screen.findByRole("button", { name: "Marcar como completada" }));
  expect(await screen.findByText("Lección guardada como completada.")).toBeInTheDocument();
  expect(LearningService.complete).toHaveBeenCalledExactlyOnceWith("11");
  expect(screen.getByRole("progressbar", { name: "Progreso del curso" })).toHaveAttribute("aria-valuenow", "50");
  expect(screen.getByRole("link", { name: "Abrir Segunda lección" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /Siguiente lección/ })).toHaveAttribute("href", "/aprender/1/lecciones/12");
  expect(screen.getByRole("heading", { name: "Introducción", exact: true })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Marcar como completada" })).not.toBeInTheDocument();
});

it("completar: un error no cambia el progreso ni desbloquea la siguiente lección", async () => {
  LearningService.complete.mockRejectedValue({ response: { status: 500, data: { error: {
    message: "No se pudo guardar el progreso.",
  } } } });
  wrap();
  await userEvent.click(await screen.findByRole("button", { name: "Marcar como completada" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar el progreso.");
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  expect(screen.getByRole("button", { name: "Segunda lección: bloqueada" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Marcar como completada" })).toBeEnabled();
});

it("completar: deshabilita el botón mientras se guarda y no duplica la petición", async () => {
  let resolve;
  LearningService.complete.mockReturnValue(new Promise((done) => { resolve = done; }));
  wrap();
  await userEvent.click(await screen.findByRole("button", { name: "Marcar como completada" }));
  const saving = screen.getByRole("button", { name: "Guardando progreso…" });
  expect(saving).toBeDisabled();
  await userEvent.click(saving);
  expect(LearningService.complete).toHaveBeenCalledTimes(1);
  resolve(savedProgress);
  expect(await screen.findByText("Esta lección está completada.")).toBeInTheDocument();
});

it("completar: una lección ya completada no ofrece volver a guardarla al recargar", async () => {
  LearningService.progress.mockResolvedValue(savedProgress);
  wrap("/aprender/1/lecciones/11");
  expect(await screen.findByText("Esta lección está completada.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Marcar como completada" })).not.toBeInTheDocument();
  expect(LearningService.complete).not.toHaveBeenCalled();
});

it("completar: puede continuar a la siguiente lección después de guardar", async () => {
  LearningService.complete.mockResolvedValue(savedProgress);
  LearningService.lesson.mockImplementation(async (id) => ({
    ...lesson, id: Number(id), titulo: id === "12" ? "Segunda lección" : "Introducción",
  }));
  wrap();
  await userEvent.click(await screen.findByRole("button", { name: "Marcar como completada" }));
  await userEvent.click(await screen.findByRole("link", { name: /Siguiente lección/ }));
  expect(await screen.findByRole("heading", { name: "Segunda lección", exact: true })).toBeInTheDocument();
  await waitFor(() => expect(LearningService.lesson).toHaveBeenLastCalledWith("12", expect.any(AbortSignal)));
});

it("completar: muestra curso completado solo cuando el servidor confirma que todas terminaron", async () => {
  LearningService.progress.mockResolvedValue({
    ...savedProgress, completadas: 2, porcentaje: 100, completado: true,
    lecciones: savedProgress.lecciones.map((item) => ({ ...item, completada: true })),
  });
  wrap("/aprender/1/lecciones/12");
  expect(await screen.findByText("Completaste todas las lecciones de este curso.")).toBeInTheDocument();
  expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "100");
});
