import { beforeEach, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LearningPage } from "../pages/LearningPage";
import { LearningService } from "../services/LearningService";

vi.mock("../services/LearningService", () => ({ LearningService: {
  progress: vi.fn(), lesson: vi.fn(),
} }));
const summary = {
  curso: { id: 1, titulo: "Node.js desde cero", estado: "publicado" },
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

it("aula: no ofrece rendir cuestionarios ni inventa preguntas o botones de completar", async () => {
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
