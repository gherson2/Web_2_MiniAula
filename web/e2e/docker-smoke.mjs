import assert from "node:assert/strict";
import { chromium, request } from "@playwright/test";

// Comprueba el despliegue real. Solo elimina el curso temporal que crea esta prueba.
const baseURL = process.env.DOCKER_TEST_URL || "http://localhost:8080";
const email = process.env.DOCKER_TEST_EMAIL || "ana@miniaula.test";
const password = process.env.DOCKER_TEST_PASSWORD || "DemoAula2026!";
let client = await request.newContext({ baseURL });
let browser;
let courseId;

async function expectResponse(response, status) {
  assert.equal(response.status(), status, `${response.url()}: ${await response.text()}`);
  return status === 204 ? null : response.json();
}

try {
  const catalog = await expectResponse(await client.get("/api/cursos"), 200);
  assert.ok(catalog.pagination.total >= 3, "Debe haber cursos de demostración.");
  const docs = await expectResponse(await client.get("/api/docs.json"), 200);
  assert.ok(docs.paths["/cursos/{id}/lecciones/orden"]);
  await expectResponse(await client.get("/api/users/me"), 401);
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 375, height: 812 } });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${baseURL}/login`);
  await page.getByLabel("Correo electrónico").fill(email);
  await page.getByLabel("Contraseña").fill(password);
  await page.getByRole("button", { name: /Iniciar sesión/ }).click();
  await page.waitForURL("**/instructor/cursos");
  const session = await page.evaluate(() => JSON.parse(localStorage.getItem("miniaula.session")));
  assert.equal(session.usuario.rol, "instructor");
  await client.dispose();
  client = await request.newContext({
    baseURL, extraHTTPHeaders: { Authorization: `Bearer ${session.token}` },
  });

  const title = `Verificación Docker ${Date.now()}`;
  const course = await expectResponse(await client.post("/api/cursos", { data: {
    titulo: title, descripcion: "Curso temporal de verificación automática.",
    categoria: "Prueba Docker", nivel: "basico",
  } }), 201);
  courseId = course.id;
  assert.equal(course.estado, "borrador");
  await expectResponse(await client.patch(`/api/cursos/${courseId}/estado`, { data: { estado: "publicado" } }), 409);
  const lessons = [];
  for (const titulo of ["Primera lección Docker", "Segunda lección Docker"]) {
    lessons.push(await expectResponse(await client.post(`/api/cursos/${courseId}/lecciones`, {
      data: { titulo, contenido: "Texto privado para la prueba con PostgreSQL real." },
    }), 201));
  }
  await expectResponse(await client.patch(`/api/cursos/${courseId}/lecciones/orden`, {
    data: { lecciones: [lessons[1].id, lessons[0].id] },
  }), 200);
  const detail = await expectResponse(await client.get(`/api/instructor/cursos/${courseId}`), 200);
  assert.deepEqual(detail.lecciones.map((lesson) => lesson.id), [lessons[1].id, lessons[0].id]);
  await expectResponse(await client.patch(`/api/cursos/${courseId}/estado`, { data: { estado: "publicado" } }), 200);
  const publicDetail = await expectResponse(await client.get(`/api/cursos/${courseId}`), 200);
  assert.equal(JSON.stringify(publicDetail).includes("Texto privado"), false);
  assert.equal(publicDetail.lecciones[0].contenido, undefined);

  await page.goto(`${baseURL}/instructor/cursos/${courseId}/editar`);
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
  await page.getByText("Segunda lección Docker", { exact: true }).waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.getByRole("link", { name: /Ver página pública/ }).click();
  await page.getByRole("heading", { name: "Segunda lección Docker" }).waitFor();
  assert.equal(await page.getByText("Texto privado", { exact: false }).count(), 0);
  await page.reload();
  await page.getByRole("button", { name: "Salir", exact: true }).waitFor();
  await page.goto(`${baseURL}/perfil`);
  await page.getByLabel("Nombre completo").waitFor();
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  await page.waitForURL("**/login");
  await expectResponse(await client.patch(`/api/cursos/${courseId}/estado`, { data: { estado: "archivado" } }), 200);
  await expectResponse(await client.get(`/api/cursos/${courseId}`), 404);
  assert.deepEqual(errors, [], "No debe haber excepciones en el frontend compilado.");
  console.log("Docker verificado: Nginx + React compilado + API + PostgreSQL real.");
  console.log("Login, perfil, sesión, CRUD de curso/lecciones, orden, publicación, privacidad y archivo correctos.");
} finally {
  if (courseId) {
    const result = await client.delete(`/api/cursos/${courseId}`);
    if (result.status() !== 204) {
      console.error("No se pudo limpiar el curso temporal:", courseId);
      process.exitCode = 1;
    } else {
      console.log("Curso temporal eliminado; no se modificaron cursos existentes.");
    }
  }
  await browser?.close();
  await client.dispose();
}
