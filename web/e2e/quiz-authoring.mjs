import assert from "node:assert/strict";

export async function exerciseQuizAuthoring(page, base, results) {
  await page.goto(`${base}/instructor/cursos/nuevo`);
  await page.getByLabel("Título del curso").fill("Cuestionarios de prueba E2E");
  await page.getByLabel("Categoría", { exact: true }).fill("Programación");
  await page.getByLabel("Descripción").fill("Curso temporal para verificar la preparación de evaluaciones.");
  await page.getByRole("button", { name: "Crear borrador" }).click();
  await page.waitForURL("**/editar");
  const courseEditor = page.url();
  await page.getByRole("button", { name: "+ Agregar", exact: true }).click();
  await page.getByLabel("Título de la lección").fill("Evaluación E2E");
  await page.getByLabel("Tipo de lección").selectOption("cuestionario");
  await page.getByLabel("Nota mínima de aprobación").fill("80");
  await page.getByRole("button", { name: "Guardar lección", exact: true }).click();
  await page.getByText("Lección guardada.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Preguntas de Evaluación E2E" }).click();
  await page.getByText("Todavía no hay preguntas", { exact: true }).waitFor();
  const questionEditor = page.url();
  await page.getByRole("button", { name: "+ Agregar pregunta", exact: true }).click();
  await page.getByLabel("Enunciado de la pregunta").fill("E2E: ¿Qué método crea un recurso?");
  for (const [index, text] of ["GET", "POST", "DELETE"].entries()) {
    await page.getByLabel(`Opción ${index + 1}`, { exact: true }).fill(text);
  }
  await page.getByLabel("Respuesta correcta").selectOption("1");
  const createResponse = page.waitForResponse((response) =>
    response.request().method() === "POST" && response.url().endsWith("/preguntas"));
  await page.getByRole("button", { name: "Guardar pregunta", exact: true }).click();
  const created = await createResponse;
  assert.equal(created.status(), 201);
  assert.equal((await created.json()).indiceCorrecto, undefined);
  await page.getByRole("heading", { name: "E2E: ¿Qué método crea un recurso?", exact: true }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Editar pregunta", exact: true }).click();
  assert.equal(await page.getByLabel("Respuesta correcta").inputValue(), "");
  await page.getByLabel("Enunciado de la pregunta").fill("Pregunta E2E editada");
  await page.getByRole("button", { name: "+ Agregar opción", exact: true }).click();
  await page.getByLabel("Opción 4", { exact: true }).fill("PATCH");
  await page.getByLabel("Respuesta correcta").selectOption("1");
  const updateResponse = page.waitForResponse((response) =>
    response.request().method() === "PUT" && response.url().includes("/preguntas/"));
  await page.getByRole("button", { name: "Guardar pregunta", exact: true }).click();
  const updated = await updateResponse;
  assert.equal(updated.status(), 200);
  assert.equal((await updated.json()).indiceCorrecto, undefined);
  await page.getByRole("heading", { name: "Pregunta E2E editada", exact: true }).waitFor();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Eliminar pregunta", exact: true }).click();
  await page.getByText("Todavía no hay preguntas", { exact: true }).waitFor();
  await page.getByRole("button", { name: "+ Agregar pregunta", exact: true }).click();
  await page.getByLabel("Enunciado de la pregunta").fill("Pregunta final E2E");
  await page.getByLabel("Opción 1", { exact: true }).fill("Verdadero");
  await page.getByLabel("Opción 2", { exact: true }).fill("Falso");
  await page.getByRole("button", { name: "Quitar opción 3", exact: true }).click();
  await page.getByLabel("Respuesta correcta").selectOption("0");
  await page.getByRole("button", { name: "Guardar pregunta", exact: true }).click();
  await page.getByRole("heading", { name: "Pregunta final E2E", exact: true }).waitFor();
  await page.goto(courseEditor);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  assert.equal(await page.getByLabel("Tipo de lección").isDisabled(), true);
  await page.getByLabel("Nota mínima de aprobación").fill("85");
  await page.getByRole("button", { name: "Guardar lección", exact: true }).click();
  await page.getByText("Lección guardada.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Preguntas de Evaluación E2E" }).click();
  await page.getByText(/Nota mínima: 85 \/ 100/).waitFor();
  await page.getByRole("heading", { name: "Pregunta final E2E", exact: true }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({ path: `${results}/editor-cuestionario-movil.png`, fullPage: true });
  return questionEditor;
}
