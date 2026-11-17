import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createServer } from "vite";

process.env.NODE_ENV = "test";
process.env.DB_TEST_MEMORY = "true";
process.env.JWT_SECRET = randomBytes(48).toString("hex");
process.env.SEED_PASSWORD = "DemoAula2026!";
process.env.FRONTEND_ORIGIN = "http://127.0.0.1:5175";

const { app } = await import("../../api/app.js");
const { sequelize } = await import("../../api/models/index.js");
const { migrate } = await import("../../api/database/migrate.js");
const { seed } = await import("../../api/database/seed.js");
let browser;
let vite;
let server;
const results = fileURLToPath(new URL("../test-results/", import.meta.url));

async function checkWidth(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    `No debe existir desbordamiento horizontal en ${page.url()}`);
}
try {
  await migrate();
  await seed();
  server = await new Promise((done) => {
    const instance = app.listen(0, "127.0.0.1", () => done(instance));
  });
  process.env.VITE_API_URL = `http://127.0.0.1:${server.address().port}/api`;
  vite = await createServer({
    root: fileURLToPath(new URL("../", import.meta.url)),
    server: { host: "127.0.0.1", port: 5175, strictPort: true },
  });
  await vite.listen();
  browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mkdir(results, { recursive: true });
  const base = "http://127.0.0.1:5175";
  await page.goto(base);
  await page.getByRole("heading", { name: "Node.js desde cero" }).waitFor();
  await page.screenshot({ path: `${results}/catalogo-escritorio.png`, fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await checkWidth(page);
  await page.screenshot({ path: `${results}/catalogo-movil.png`, fullPage: true });
  await page.goto(`${base}/login`);
  await checkWidth(page);
  await page.getByLabel("Correo electrónico").fill("ana@miniaula.test");
  await page.getByLabel("Contraseña").fill("DemoAula2026!");
  await page.getByRole("button", { name: /Iniciar sesión/ }).click();
  await page.waitForURL("**/instructor/cursos");
  await page.getByRole("link", { name: "+ Crear un curso" }).click();
  await page.getByLabel("Título del curso").fill("Curso completo de prueba E2E");
  await page.getByLabel("Categoría", { exact: true }).fill("Programación");
  await page.getByLabel("Descripción").fill("Un curso creado desde el navegador para verificar el flujo del instructor.");
  await page.getByRole("button", { name: "Crear borrador" }).click();
  await page.waitForURL("**/editar");
  const editorUrl = page.url();
  await page.getByRole("button", { name: "Publicar curso", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Agrega al menos una lección" }).waitFor();
  await page.getByRole("button", { name: "+ Agregar", exact: true }).click();
  await page.getByLabel("Título de la lección").fill("Introducción de prueba");
  await page.getByLabel("Contenido de texto").fill("Este contenido es privado y no debe salir en el detalle público.");
  await page.getByRole("button", { name: "Guardar lección", exact: true }).click();
  await page.getByText("Lección guardada.", { exact: true }).waitFor();
  await checkWidth(page);
  await page.getByRole("button", { name: "Publicar curso", exact: true }).click();
  await page.getByText("Publicado", { exact: true }).waitFor();
  await page.screenshot({ path: `${results}/editor-movil.png`, fullPage: true });
  await page.getByRole("link", { name: /Ver página pública/ }).click();
  await page.getByRole("heading", { name: "Introducción de prueba" }).waitFor();
  assert.equal(await page.getByText("Este contenido es privado", { exact: false }).count(), 0);
  await checkWidth(page);
  await page.reload();
  await page.getByRole("button", { name: "Salir", exact: true }).waitFor();
  await page.goto(editorUrl);
  await page.getByRole("heading", { name: "Información del curso" }).waitFor();
  await page.getByRole("button", { name: "Salir", exact: true }).click();
  await page.waitForURL("**/login");
  await page.goto(`${base}/registro`);
  await page.getByLabel("Nombre completo").fill("Estudiante E2E");
  await page.getByLabel("Correo electrónico").fill("estudiante.e2e@example.test");
  await page.getByLabel("Contraseña").fill("Password2026!");
  await page.getByRole("button", { name: /Crear mi cuenta/ }).click();
  await page.waitForURL("**/cursos");
  await page.getByRole("heading", { name: "Curso completo de prueba E2E" }).waitFor();
  await page.goto(`${base}/instructor/cursos`);
  await page.getByRole("heading", { name: "Esta sección es para instructores" }).waitFor();
  await checkWidth(page);
  assert.deepEqual(errors, [], "No debe haber excepciones de JavaScript en el navegador.");
  console.log("E2E correcto: catálogo, login, registro, curso, lección, publicación, privacidad, persistencia y permisos; móvil 375px sin desbordamiento.");
  console.log("Capturas guardadas en web/test-results/.");
} finally {
  await browser?.close();
  await vite?.close();
  if (server) await new Promise((done) => server.close(done));
  await sequelize.close();
}
