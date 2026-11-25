import { beforeEach, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { LessonForm } from "../components/LessonForm";
import { QuestionForm } from "../components/QuestionForm";
import { QuizEditorPage } from "../pages/QuizEditorPage";
import { ProtectedRoute } from "../components/ProtectedRoute";
import { AuthContext } from "../context/AuthContext";
import { QuestionService } from "../services/QuestionService";
import { CourseService } from "../services/CourseService";

vi.mock("../services/QuestionService", () => ({ QuestionService: {
  list: vi.fn(), create: vi.fn(), update: vi.fn(), remove: vi.fn(),
} }));
vi.mock("../services/CourseService", () => ({ CourseService: {
  addLesson: vi.fn(), updateLesson: vi.fn(),
} }));
const question = { id: 20, leccionId: 7, enunciado: "¿Qué método crea un recurso?", opciones: ["GET", "POST", "DELETE"] };
const result = (data = [], total = data.length) => ({
  leccion: { id: 7, titulo: "Evaluación", tipo: "cuestionario", notaMinima: 80, cursoId: 9 },
  data, pagination: { page: 1, limit: 10, total, pages: Math.ceil(total / 10) },
});
function editor() {
  return render(<MemoryRouter initialEntries={["/instructor/lecciones/7/preguntas"]}>
    <Routes><Route path="/instructor/lecciones/:id/preguntas" element={<QuizEditorPage />} /></Routes>
  </MemoryRouter>);
}
async function fillQuestion(options = ["GET", "POST", "DELETE"]) {
  await userEvent.type(screen.getByLabelText("Enunciado de la pregunta"), "¿Qué método crea un recurso?");
  for (const [index, option] of options.entries()) {
    await userEvent.type(screen.getByLabelText(`Opción ${index + 1}`), option);
  }
  await userEvent.selectOptions(screen.getByLabelText("Respuesta correcta"), "1");
}
beforeEach(() => {
  vi.restoreAllMocks();
  QuestionService.list.mockReset().mockResolvedValue(result());
  QuestionService.create.mockReset().mockResolvedValue(question);
  QuestionService.update.mockReset().mockResolvedValue(question);
  QuestionService.remove.mockReset().mockResolvedValue(undefined);
  CourseService.addLesson.mockReset().mockResolvedValue({ id: 7 });
  CourseService.updateLesson.mockReset().mockResolvedValue({ id: 7 });
});

it("lección: permite elegir cuestionario y enviar una nota mínima numérica", async () => {
  render(<LessonForm courseId={9} onSaved={vi.fn()} onCancel={vi.fn()} />);
  await userEvent.type(screen.getByLabelText("Título de la lección"), "Evaluación");
  await userEvent.selectOptions(screen.getByLabelText("Tipo de lección"), "cuestionario");
  expect(screen.queryByLabelText("Contenido de texto")).not.toBeInTheDocument();
  expect(screen.queryByLabelText("Enlace a video (opcional)")).not.toBeInTheDocument();
  await userEvent.clear(screen.getByLabelText("Nota mínima de aprobación"));
  await userEvent.type(screen.getByLabelText("Nota mínima de aprobación"), "80");
  await userEvent.click(screen.getByRole("button", { name: "Guardar lección" }));
  await waitFor(() => expect(CourseService.addLesson).toHaveBeenCalledExactlyOnceWith(9, {
    titulo: "Evaluación", tipo: "cuestionario", notaMinima: 80,
  }));
});

it("lección: conserva nota mínima cero y no permite cambiar el tipo al editar", async () => {
  render(<LessonForm courseId={9} lesson={{ id: 7, tipo: "cuestionario", titulo: "Evaluación", notaMinima: 0 }}
    onSaved={vi.fn()} onCancel={vi.fn()} />);
  expect(screen.getByLabelText("Tipo de lección")).toBeDisabled();
  expect(screen.getByLabelText("Nota mínima de aprobación")).toHaveValue(0);
  await userEvent.click(screen.getByRole("button", { name: "Guardar lección" }));
  await waitFor(() => expect(CourseService.updateLesson).toHaveBeenCalledWith(7, {
    titulo: "Evaluación", tipo: "cuestionario", notaMinima: 0,
  }));
});

it("pregunta: envía enunciado, opciones y clave solo a la capa de servicios", async () => {
  const saved = vi.fn();
  render(<QuestionForm lessonId={7} onSaved={saved} onCancel={vi.fn()} />);
  await fillQuestion();
  await userEvent.click(screen.getByRole("button", { name: "Guardar pregunta" }));
  await waitFor(() => expect(QuestionService.create).toHaveBeenCalledExactlyOnceWith(7, {
    enunciado: question.enunciado, opciones: question.opciones, indiceCorrecto: 1,
  }));
  expect(saved).toHaveBeenCalledTimes(1);
});

it("pregunta: rechaza opciones repetidas sin llamar a la API", async () => {
  render(<QuestionForm lessonId={7} onSaved={vi.fn()} onCancel={vi.fn()} />);
  await fillQuestion(["GET", "get", "POST"]);
  await userEvent.click(screen.getByRole("button", { name: "Guardar pregunta" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("sin repetirlas");
  expect(QuestionService.create).not.toHaveBeenCalled();
});

it("pregunta: al editar exige seleccionar nuevamente la respuesta correcta", async () => {
  render(<QuestionForm lessonId={7} question={question} onSaved={vi.fn()} onCancel={vi.fn()} />);
  expect(screen.getByLabelText("Respuesta correcta")).toHaveValue("");
  expect(screen.getByText(/la API no devuelve la respuesta guardada/)).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Guardar pregunta" }));
  expect(QuestionService.update).not.toHaveBeenCalled();
  await userEvent.selectOptions(screen.getByLabelText("Respuesta correcta"), "0");
  await userEvent.click(screen.getByRole("button", { name: "Guardar pregunta" }));
  await waitFor(() => expect(QuestionService.update).toHaveBeenCalledWith(20, {
    enunciado: question.enunciado, opciones: question.opciones, indiceCorrecto: 0,
  }));
});

it("pregunta: limita opciones y limpia la clave al eliminar una opción", async () => {
  render(<QuestionForm lessonId={7} onSaved={vi.fn()} onCancel={vi.fn()} />);
  await userEvent.selectOptions(screen.getByLabelText("Respuesta correcta"), "1");
  await userEvent.click(screen.getByRole("button", { name: "Quitar opción 3" }));
  expect(screen.getByLabelText("Respuesta correcta")).toHaveValue("");
  expect(screen.getByRole("button", { name: "Quitar opción 1" })).toBeDisabled();
  for (let i = 0; i < 4; i++) await userEvent.click(screen.getByRole("button", { name: "+ Agregar opción" }));
  expect(screen.getByLabelText("Opción 6")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "+ Agregar opción" })).toBeDisabled();
});

it("pregunta: muestra un error de curso inscrito y conserva el formulario", async () => {
  QuestionService.create.mockRejectedValue({ response: { status: 409, data: { error: { message: "El curso tiene inscritos." } } } });
  render(<QuestionForm lessonId={7} onSaved={vi.fn()} onCancel={vi.fn()} />);
  await fillQuestion();
  await userEvent.click(screen.getByRole("button", { name: "Guardar pregunta" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("El curso tiene inscritos.");
  expect(screen.getByLabelText("Enunciado de la pregunta")).toHaveValue(question.enunciado);
  expect(screen.getByRole("button", { name: "Guardar pregunta" })).toBeEnabled();
});

it("editor: maneja carga y lista vacía y permite agregar una pregunta", async () => {
  QuestionService.list.mockResolvedValueOnce(result()).mockResolvedValue(result([question]));
  editor();
  expect(screen.getByText("Cargando…")).toBeInTheDocument();
  expect(await screen.findByText("Todavía no hay preguntas")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "+ Agregar pregunta" }));
  await fillQuestion();
  await userEvent.click(screen.getByRole("button", { name: "Guardar pregunta" }));
  expect(await screen.findByRole("heading", { name: question.enunciado })).toBeInTheDocument();
  expect(screen.getByText("Pregunta guardada.")).toBeInTheDocument();
});

it("editor: pagina utilizando el servicio", async () => {
  QuestionService.list.mockResolvedValue(result([question], 12));
  editor();
  await userEvent.click(await screen.findByRole("button", { name: /Siguiente/ }));
  await waitFor(() => expect(QuestionService.list).toHaveBeenLastCalledWith(
    "7", { page: 2, limit: 10 }, expect.any(AbortSignal)));
});

it("editor: elimina una pregunta solo después de confirmar", async () => {
  QuestionService.list.mockResolvedValueOnce(result([question])).mockResolvedValue(result());
  vi.spyOn(window, "confirm").mockReturnValue(true);
  editor();
  await userEvent.click(await screen.findByRole("button", { name: "Eliminar pregunta" }));
  expect(await screen.findByText("Todavía no hay preguntas")).toBeInTheDocument();
  expect(QuestionService.remove).toHaveBeenCalledExactlyOnceWith(20);
});

it("editor: muestra rechazo de permisos y ofrece reintentar", async () => {
  QuestionService.list.mockRejectedValueOnce({ response: { status: 403,
    data: { error: { message: "Solo puedes modificar tus propias lecciones." } } } }).mockResolvedValue(result());
  editor();
  expect(await screen.findByRole("alert")).toHaveTextContent("Solo puedes modificar");
  await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("Todavía no hay preguntas")).toBeInTheDocument();
});

it("editor: la ruta del instructor impide que entre un estudiante", () => {
  render(<MemoryRouter initialEntries={["/instructor/lecciones/7/preguntas"]}>
    <AuthContext.Provider value={{ user: { rol: "estudiante" }, loading: false }}>
      <Routes><Route element={<ProtectedRoute role="instructor" />}>
        <Route path="/instructor/lecciones/:id/preguntas" element={<QuizEditorPage />} />
      </Route></Routes>
    </AuthContext.Provider>
  </MemoryRouter>);
  expect(screen.getByRole("heading", { name: "Esta sección es para instructores" })).toBeInTheDocument();
  expect(QuestionService.list).not.toHaveBeenCalled();
});
