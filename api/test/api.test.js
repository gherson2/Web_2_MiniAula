import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { summarizeProgress } from "../utils/progress.js";

// Por defecto se usa memoria. PostgreSQL real requiere habilitación explícita
// y una BD de pruebas separada cuyo nombre termine en "_test".
process.env.NODE_ENV = "test";
if (process.env.API_TEST_POSTGRES === "true" && !process.env.DB_NAME?.endsWith("_test")) {
  throw new Error("Las pruebas de PostgreSQL requieren una DB_NAME separada terminada en _test.");
}
process.env.DB_TEST_MEMORY = process.env.API_TEST_POSTGRES === "true" ? "false" : "true";
process.env.JWT_SECRET = randomBytes(48).toString("hex");
process.env.SEED_PASSWORD = "DemoAula2026!";
const { app } = await import("../app.js");
const { sequelize, Usuario, Curso, Leccion, Pregunta, Inscripcion, Progreso } = await import("../models/index.js");
const { migrate } = await import("../database/migrate.js");
const { seed } = await import("../database/seed.js");
const api = request(app);
const accounts = {};
const courseData = {
  titulo: "Curso de prueba", descripcion: "Descripción para practicar.", categoria: "Pruebas", nivel: "basico",
};
const auth = (session) => ({ Authorization: `Bearer ${session.token}` });
let courseId;
let lessonOne;
let lessonTwo;

before(async () => {
  await migrate();
  await seed();
  for (const [key, rol] of [["teacher", "instructor"], ["other", "instructor"], ["student", "estudiante"]]) {
    const result = await api.post("/api/auth/register").send({
      nombre: key, email: `${key}@example.test`, password: "Password2026!", rol,
    }).expect(201);
    accounts[key] = result.body;
  }
});
after(async () => { await sequelize.close(); });

test("migración y seed son repetibles y preparan los datos exigidos", async () => {
  await migrate();
  await seed();
  assert.equal(await Usuario.count(), 8);
  assert.equal(await Curso.count({ where: { estado: "publicado" } }), 3);
  assert.equal(await Leccion.count(), 15);
  assert.equal(await Leccion.count({ where: { tipo: "cuestionario" } }), 3);
  assert.equal(await Pregunta.count(), 3);
});

test("registro: bcrypt, rol, JWT con expiración y ninguna contraseña en respuestas", async () => {
  assert.equal(accounts.teacher.usuario.rol, "instructor");
  const user = await Usuario.scope("withPassword").findOne({ where: { email: "teacher@example.test" } });
  assert.notEqual(user.passwordHash, "Password2026!");
  assert.equal(await bcrypt.compare("Password2026!", user.passwordHash), true);
  assert.equal(JSON.stringify(accounts.teacher).includes("password"), false);
  const decoded = jwt.verify(accounts.teacher.token, process.env.JWT_SECRET);
  assert.ok(decoded.exp > decoded.iat);
});

test("registro rechaza duplicados y valida toda la entrada", async () => {
  await api.post("/api/auth/register").send({
    nombre: "Repetido", email: "TEACHER@example.test", password: "Password2026!", rol: "instructor",
  }).expect(409);
  const response = await api.post("/api/auth/register").send({
    nombre: "", email: "invalido", password: "123", rol: "admin",
  }).expect(422);
  assert.equal(response.body.error.code, "VALIDATION_ERROR");
  assert.ok(response.body.error.details.length >= 3);
  await api.post("/api/auth/register").send({
    nombre: "Prueba", email: "extra@example.test", password: "Password2026!", rol: "estudiante", id: 1,
  }).expect(422);
});

test("login y protección de sesión: credenciales incorrectas, token vencido y token falso", async () => {
  await api.post("/api/auth/login").send({ email: "teacher@example.test", password: "incorrecta" }).expect(401);
  const response = await api.post("/api/auth/login").send({ email: "teacher@example.test", password: "Password2026!" }).expect(200);
  assert.ok(response.body.token);
  await api.get("/api/users/me").expect(401);
  await api.get("/api/users/me").set("Authorization", "Bearer falso").expect(401);
  const expired = jwt.sign({}, process.env.JWT_SECRET, { subject: String(accounts.teacher.usuario.id), expiresIn: -1 });
  await api.get("/api/users/me").set("Authorization", `Bearer ${expired}`).expect(401);
});

test("perfil: ver y editar al propio usuario sin permitir escalar de rol", async () => {
  const response = await api.get("/api/users/me").set(auth(accounts.student)).expect(200);
  assert.deepEqual(Object.keys(response.body).sort(), ["email", "id", "nombre", "rol"]);
  const edited = await api.put("/api/users/me").set(auth(accounts.student)).send({
    nombre: "Estudiante actualizado", email: "student@example.test",
  }).expect(200);
  assert.equal(edited.body.nombre, "Estudiante actualizado");
  await api.put("/api/users/me").set(auth(accounts.student)).send({
    nombre: "Admin", email: "student@example.test", rol: "instructor",
  }).expect(422);
  await api.put("/api/users/me").set(auth(accounts.student)).send({
    nombre: "Repetido", email: "teacher@example.test",
  }).expect(409);
});

test("catálogo: búsqueda, categoría, paginación y categorías publicadas", async () => {
  const response = await api.get("/api/cursos?q=Node&categoria=Programaci%C3%B3n&page=1&limit=1").expect(200);
  assert.equal(response.body.data.length, 1);
  assert.equal(response.body.pagination.total, 1);
  assert.equal(response.body.data[0].titulo, "Node.js desde cero");
  const empty = await api.get("/api/cursos?q=no-existe").expect(200);
  assert.deepEqual(empty.body.data, []);
  const categories = await api.get("/api/categorias").expect(200);
  assert.ok(categories.body.includes("Programación"));
  const second = await api.get("/api/cursos?page=2&limit=2").expect(200);
  assert.equal(second.body.pagination.pages, 2);
  assert.equal(second.body.data.length, 1);
});

test("detalle público devuelve solo temario, nunca contenido, hash o respuestas correctas", async () => {
  const response = await api.get("/api/cursos/1").expect(200);
  assert.equal(response.body.lecciones.length, 5);
  const json = JSON.stringify(response.body);
  for (const field of ['"contenido":', '"videoUrl":', '"passwordHash":', '"indiceCorrecto":', '"preguntas":']) {
    assert.equal(json.includes(field), false, `No debe exponer ${field}`);
  }
});

test("solo instructores crean cursos; todos empiezan como borrador", async () => {
  await api.post("/api/cursos").send(courseData).expect(401);
  await api.post("/api/cursos").set(auth(accounts.student)).send(courseData).expect(403);
  await api.post("/api/cursos").set(auth(accounts.teacher)).send({ ...courseData, estado: "publicado" }).expect(422);
  const response = await api.post("/api/cursos").set(auth(accounts.teacher)).send(courseData).expect(201);
  courseId = response.body.id;
  assert.equal(response.body.estado, "borrador");
  const list = await api.get("/api/instructor/cursos").set(auth(accounts.teacher)).expect(200);
  assert.equal(list.body.pagination.total, 1);
  await api.get(`/api/cursos/${courseId}`).expect(404);
});

test("propiedad del curso: otro instructor no puede leer edición, cambiar, borrar o publicar", async () => {
  for (const method of ["get", "put", "delete", "patch"]) {
    const path = method === "get" ? `/api/instructor/cursos/${courseId}` :
      `/api/cursos/${courseId}${method === "patch" ? "/estado" : ""}`;
    let action = api[method](path).set(auth(accounts.other));
    if (method === "put") action = action.send(courseData);
    if (method === "patch") action = action.send({ estado: "publicado" });
    await action.expect(403);
  }
  await api.get("/api/instructor/cursos").set(auth(accounts.student)).expect(403);
});

test("publicación exige al menos una lección; edición mantiene borrador", async () => {
  const result = await api.patch(`/api/cursos/${courseId}/estado`).set(auth(accounts.teacher))
    .send({ estado: "publicado" }).expect(409);
  assert.equal(result.body.error.code, "EMPTY_COURSE");
  const update = await api.put(`/api/cursos/${courseId}`).set(auth(accounts.teacher))
    .send({ ...courseData, titulo: "Curso de prueba actualizado" }).expect(200);
  assert.equal(update.body.estado, "borrador");
});

test("lecciones: creación, validación de texto/video y permisos del dueño", async () => {
  const path = `/api/cursos/${courseId}/lecciones`;
  await api.post(path).set(auth(accounts.other)).send({ titulo: "Ajena", contenido: "Texto" }).expect(403);
  await api.post(path).set(auth(accounts.teacher)).send({ titulo: "Vacía" }).expect(422);
  await api.post(path).set(auth(accounts.teacher)).send({ titulo: "URL", videoUrl: "javascript:alert(1)" }).expect(422);
  const first = await api.post(path).set(auth(accounts.teacher))
    .send({ titulo: "Primera", contenido: "Contenido privado" }).expect(201);
  lessonOne = first.body.id;
  assert.equal(first.body.orden, 1);
  const second = await api.post(path).set(auth(accounts.teacher))
    .send({ titulo: "Segunda", videoUrl: "https://example.com/video" }).expect(201);
  lessonTwo = second.body.id;
  assert.equal(second.body.orden, 2);
  await api.put(`/api/lecciones/${lessonOne}`).set(auth(accounts.other)).send({ titulo: "No", contenido: "No" }).expect(403);
  await api.delete(`/api/lecciones/${lessonOne}`).set(auth(accounts.other)).expect(403);
  await api.put(`/api/lecciones/${lessonOne}`).set(auth(accounts.teacher))
    .send({ titulo: "Primera editada", contenido: "Contenido actualizado", videoUrl: "" }).expect(200);
});

test("reordenar exige lista completa y única, y guarda el nuevo orden", async () => {
  const path = `/api/cursos/${courseId}/lecciones/orden`;
  await api.patch(path).set(auth(accounts.teacher)).send({ lecciones: [lessonOne, lessonOne] }).expect(422);
  await api.patch(path).set(auth(accounts.teacher)).send({ lecciones: [lessonOne] }).expect(422);
  await api.patch(path).set(auth(accounts.teacher)).send({ lecciones: [lessonOne, 999999] }).expect(422);
  await api.patch(path).set(auth(accounts.other)).send({ lecciones: [lessonOne, lessonTwo] }).expect(403);
  await api.patch(path).set(auth(accounts.teacher)).send({ lecciones: [lessonTwo, lessonOne] }).expect(200);
  const detail = await api.get(`/api/instructor/cursos/${courseId}`).set(auth(accounts.teacher)).expect(200);
  assert.deepEqual(detail.body.lecciones.map((item) => item.id), [lessonTwo, lessonOne]);
});

test("publicar permite verlo en catálogo, pero el contenido privado sigue protegido", async () => {
  await api.patch(`/api/cursos/${courseId}/estado`).set(auth(accounts.teacher)).send({ estado: "publicado" }).expect(200);
  const detail = await api.get(`/api/cursos/${courseId}`).expect(200);
  assert.equal(JSON.stringify(detail.body).includes("Contenido actualizado"), false);
  const list = await api.get("/api/cursos?categoria=Pruebas").expect(200);
  assert.equal(list.body.pagination.total, 1);
  const privateDetail = await api.get(`/api/instructor/cursos/${courseId}`).set(auth(accounts.teacher)).expect(200);
  assert.ok(JSON.stringify(privateDetail.body).includes("Contenido actualizado"));
  await api.get(`/api/instructor/cursos/${courseId}`).set(auth(accounts.student)).expect(403);
});

test("eliminar lecciones compacta el orden e impide dejar un curso publicado vacío", async () => {
  await api.delete(`/api/lecciones/${lessonTwo}`).set(auth(accounts.teacher)).expect(204);
  const detail = await api.get(`/api/instructor/cursos/${courseId}`).set(auth(accounts.teacher)).expect(200);
  assert.equal(detail.body.lecciones[0].orden, 1);
  await api.delete(`/api/lecciones/${lessonOne}`).set(auth(accounts.teacher)).expect(409);
  await api.patch(`/api/cursos/${courseId}/estado`).set(auth(accounts.teacher)).send({ estado: "archivado" }).expect(200);
  await api.get(`/api/cursos/${courseId}`).expect(404);
  await api.delete(`/api/cursos/${courseId}`).set(auth(accounts.teacher)).expect(204);
  assert.equal(await Leccion.count({ where: { cursoId: courseId } }), 0);
});

test("un curso con inscritos no se elimina ni cambia su estructura, pero sí se archiva", async () => {
  const course = await Curso.create({ ...courseData, instructorId: accounts.teacher.usuario.id });
  const lesson = await Leccion.create({ titulo: "Inscritos", tipo: "contenido", contenido: "Texto", orden: 1, cursoId: course.id });
  await Inscripcion.create({ cursoId: course.id, estudianteId: accounts.student.usuario.id });
  const path = `/api/cursos/${course.id}`;
  await api.delete(path).set(auth(accounts.teacher)).expect(409);
  await api.delete(`/api/lecciones/${lesson.id}`).set(auth(accounts.teacher)).expect(409);
  await api.post(`${path}/lecciones`).set(auth(accounts.teacher)).send({ titulo: "Nueva", contenido: "Texto" }).expect(409);
  await api.patch(`${path}/estado`).set(auth(accounts.teacher)).send({ estado: "archivado" }).expect(200);
  await assert.rejects(() => Inscripcion.create({ cursoId: course.id, estudianteId: accounts.student.usuario.id }));
});

test("validación de params/query, formato de errores, JSON inválido, docs y cabeceras de seguridad", async () => {
  for (const path of ["/api/cursos/no-es-id", "/api/cursos?page=0", "/api/cursos?limit=100", "/api/cursos?extra=1"]) {
    const result = await api.get(path).expect(422);
    assert.deepEqual(Object.keys(result.body.error).sort(), ["code", "details", "message"]);
  }
  await api.post("/api/auth/login").set("Content-Type", "application/json").send("{").expect(400);
  await api.get("/api/no-existe").expect(404);
  const welcome = await api.get("/api").expect(200);
  assert.equal(welcome.headers["x-content-type-options"], "nosniff");
  assert.equal(welcome.headers["x-powered-by"], undefined);
  const docs = await api.get("/api/docs.json").expect(200);
  assert.ok(docs.body.paths["/lecciones/{id}"]);
  await api.get("/api/docs/").expect(200);
});

test("login tiene límite de intentos con error normalizado", async () => {
  let response;
  for (let i = 0; i < 22; i++) {
    response = await api.post("/api/auth/login").send({ email: "teacher@example.test", password: "x" });
    if (response.status === 429) break;
  }
  assert.equal(response.status, 429);
  assert.equal(response.body.error.code, "RATE_LIMIT");
});

test("inscripción: exige sesión de estudiante y valida params, body y query", async () => {
  await api.post("/api/cursos/1/inscripcion").expect(401);
  await api.post("/api/cursos/1/inscripcion").set(auth(accounts.teacher)).expect(403);
  await api.get("/api/inscripciones/mias").expect(401);
  await api.get("/api/inscripciones/mias").set(auth(accounts.teacher)).expect(403);
  await api.post("/api/cursos/invalido/inscripcion").set(auth(accounts.student)).expect(422);
  await api.post("/api/cursos/1/inscripcion").set(auth(accounts.student))
    .send({ estudianteId: accounts.other.usuario.id }).expect(422);
  for (const query of ["page=0", "limit=51", "cursoId=0", "estudianteId=1"]) {
    await api.get(`/api/inscripciones/mias?${query}`).set(auth(accounts.student)).expect(422);
  }
});

test("estudiante se inscribe una sola vez y el servidor determina su identidad", async () => {
  const result = await api.post("/api/cursos/1/inscripcion").set(auth(accounts.student)).expect(201);
  assert.deepEqual(Object.keys(result.body).sort(), ["completado", "cursoId", "fechaInscripcion", "id"]);
  assert.equal(result.body.cursoId, 1);
  const saved = await Inscripcion.findByPk(result.body.id);
  assert.equal(saved.estudianteId, accounts.student.usuario.id);
  const duplicate = await api.post("/api/cursos/1/inscripcion").set(auth(accounts.student)).send({}).expect(409);
  assert.equal(duplicate.body.error.code, "ALREADY_ENROLLED");
  assert.equal(await Inscripcion.count({ where: { cursoId: 1, estudianteId: accounts.student.usuario.id } }), 1);
});

test("solo se admiten inscripciones en cursos publicados existentes", async () => {
  for (const estado of ["borrador", "archivado"]) {
    const course = await Curso.create({ ...courseData, estado, instructorId: accounts.teacher.usuario.id });
    await api.post(`/api/cursos/${course.id}/inscripcion`).set(auth(accounts.student)).expect(404);
    assert.equal(await Inscripcion.count({ where: { cursoId: course.id } }), 0);
  }
  await api.post("/api/cursos/2147483647/inscripcion").set(auth(accounts.student)).expect(404);
});

test("mis inscripciones son privadas, paginadas y no revelan contenido ni respuestas", async () => {
  const filtered = await api.get("/api/inscripciones/mias?cursoId=1").set(auth(accounts.student)).expect(200);
  assert.equal(filtered.body.pagination.total, 1);
  assert.equal(filtered.body.data[0].curso.titulo, "Node.js desde cero");
  assert.equal(filtered.body.data[0].curso.instructor.nombre, "Ana Pérez");
  const json = JSON.stringify(filtered.body);
  for (const field of ['"contenido":', '"videoUrl":', '"passwordHash":', '"indiceCorrecto":', '"lecciones":']) {
    assert.equal(json.includes(field), false, `No debe exponer ${field}`);
  }
  const another = await Usuario.findOne({ where: { email: "maria@miniaula.test" } });
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(another.id), expiresIn: "1h" });
  const otherList = await api.get("/api/inscripciones/mias?cursoId=1")
    .set("Authorization", `Bearer ${token}`).expect(200);
  assert.deepEqual(otherList.body.data, []);
  const firstPage = await api.get("/api/inscripciones/mias?page=1&limit=1").set(auth(accounts.student)).expect(200);
  const secondPage = await api.get("/api/inscripciones/mias?page=2&limit=1").set(auth(accounts.student)).expect(200);
  assert.ok(firstPage.body.pagination.total >= 2);
  assert.equal(firstPage.body.data.length, 1);
  assert.equal(secondPage.body.data.length, 1);
  assert.notEqual(firstPage.body.data[0].id, secondPage.body.data[0].id);
});

test("inscripción real impide borrar el curso o cambiar su estructura; se conserva al archivar", async () => {
  const course = await Curso.create({ ...courseData, instructorId: accounts.teacher.usuario.id });
  const lesson = await Leccion.create({ titulo: "Contenido inscrito", tipo: "contenido", contenido: "Texto",
    orden: 1, cursoId: course.id });
  await api.patch(`/api/cursos/${course.id}/estado`).set(auth(accounts.teacher)).send({ estado: "publicado" }).expect(200);
  await api.post(`/api/cursos/${course.id}/inscripcion`).set(auth(accounts.student)).expect(201);
  await api.delete(`/api/cursos/${course.id}`).set(auth(accounts.teacher)).expect(409);
  await api.delete(`/api/lecciones/${lesson.id}`).set(auth(accounts.teacher)).expect(409);
  await api.put(`/api/lecciones/${lesson.id}`).set(auth(accounts.teacher)).send({ titulo: "Cambio", contenido: "Cambio" }).expect(409);
  await api.patch(`/api/cursos/${course.id}/lecciones/orden`).set(auth(accounts.teacher))
    .send({ lecciones: [lesson.id] }).expect(409);
  await api.patch(`/api/cursos/${course.id}/estado`).set(auth(accounts.teacher)).send({ estado: "archivado" }).expect(200);
  const mine = await api.get(`/api/inscripciones/mias?cursoId=${course.id}`).set(auth(accounts.student)).expect(200);
  assert.equal(mine.body.data[0].curso.estado, "archivado");
  await api.post(`/api/cursos/${course.id}/inscripcion`).set(auth(accounts.student)).expect(404);
});

test("PostgreSQL real serializa inscripciones simultáneas y solo crea una", {
  skip: process.env.API_TEST_POSTGRES !== "true" && "Requiere bloqueo de filas de PostgreSQL real.",
}, async () => {
  const course = await Curso.create({ ...courseData, estado: "publicado", instructorId: accounts.teacher.usuario.id });
  const results = await Promise.all(Array.from({ length: 8 }, () =>
    api.post(`/api/cursos/${course.id}/inscripcion`).set(auth(accounts.student))));
  assert.equal(results.filter((result) => result.status === 201).length, 1);
  assert.equal(results.filter((result) => result.status === 409).length, 7);
  assert.equal(await Inscripcion.count({ where: { cursoId: course.id, estudianteId: accounts.student.usuario.id } }), 1);
});

const learningLessons = () => Leccion.findAll({ where: { cursoId: 1 }, order: [["orden", "ASC"]] });
const learningEnrollment = () => Inscripcion.findOne({
  where: { cursoId: 1, estudianteId: accounts.student.usuario.id },
});

test("aula: sesión, rol, inscripción y validación se comprueban en servidor", async () => {
  const [first] = await learningLessons();
  for (const path of ["/api/cursos/1/progreso", `/api/lecciones/${first.id}`]) {
    await api.get(path).expect(401);
    await api.get(path).set(auth(accounts.teacher)).expect(403);
    await api.get(`${path}?estudianteId=1`).set(auth(accounts.student)).expect(422);
  }
  const denied = await api.get("/api/cursos/2/progreso").set(auth(accounts.student)).expect(403);
  assert.equal(denied.body.error.code, "NOT_ENROLLED");
  for (const path of ["/api/cursos/error/progreso", "/api/lecciones/error"]) {
    await api.get(path).set(auth(accounts.student)).expect(422);
  }
  await api.get("/api/cursos/2147483647/progreso").set(auth(accounts.student)).expect(404);
  await api.get("/api/lecciones/2147483647").set(auth(accounts.student)).expect(404);
});

test("aula: el temario privado no expone contenidos y solo la primera lección está disponible", async () => {
  const response = await api.get("/api/cursos/1/progreso").set(auth(accounts.student)).expect(200);
  assert.equal(response.body.lecciones.length, 5);
  assert.equal(response.body.lecciones[0].bloqueada, false);
  assert.ok(response.body.lecciones.slice(1).every((lesson) => lesson.bloqueada));
  assert.equal(response.body.completadas, 0);
  assert.equal(response.body.porcentaje, 0);
  for (const field of ['"contenido":', '"videoUrl":', '"indiceCorrecto":', '"passwordHash":', '"preguntas":']) {
    assert.equal(JSON.stringify(response.body).includes(field), false);
  }
});

test("aula: el estudiante inscrito lee texto y video de la lección desbloqueada", async () => {
  const [first] = await learningLessons();
  await first.update({ videoUrl: "https://example.com/video-estudiante" });
  const response = await api.get(`/api/lecciones/${first.id}`).set(auth(accounts.student)).expect(200);
  assert.equal(response.body.titulo, first.titulo);
  assert.equal(response.body.contenido, first.contenido);
  assert.equal(response.body.videoUrl, "https://example.com/video-estudiante");
  assert.equal(response.body.progreso.bloqueada, false);
  assert.equal(response.body.indiceCorrecto, undefined);
  assert.equal(response.body.preguntas, undefined);
});

test("aula: saltar por URL o API a cualquier lección bloqueada devuelve 403 sin contenido", async () => {
  const lessons = await learningLessons();
  for (const lesson of lessons.slice(1)) {
    const response = await api.get(`/api/lecciones/${lesson.id}`).set(auth(accounts.student)).expect(403);
    assert.equal(response.body.error.code, "LESSON_LOCKED");
    assert.equal(response.body.contenido, undefined);
    assert.equal(response.body.videoUrl, undefined);
  }
});

test("aula: interpreta progreso propio guardado sin compartirlo con otro estudiante", async () => {
  const [first, second, third] = await learningLessons();
  const enrollment = await learningEnrollment();
  await api.post(`/api/lecciones/${first.id}/completar`).set(auth(accounts.student)).expect(200);
  await api.get(`/api/lecciones/${second.id}`).set(auth(accounts.student)).expect(200);
  await api.get(`/api/lecciones/${third.id}`).set(auth(accounts.student)).expect(403);
  const mine = await api.get("/api/cursos/1/progreso").set(auth(accounts.student)).expect(200);
  assert.equal(mine.body.porcentaje, 20);
  const another = await Usuario.findOne({ where: { email: "maria@miniaula.test" } });
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(another.id), expiresIn: "1h" });
  const headers = { Authorization: `Bearer ${token}` };
  await api.get(`/api/lecciones/${first.id}`).set(headers).expect(403);
  await api.post("/api/cursos/1/inscripcion").set(headers).expect(201);
  const otherProgress = await api.get("/api/cursos/1/progreso").set(headers).expect(200);
  assert.equal(otherProgress.body.porcentaje, 0);
  await api.get(`/api/lecciones/${second.id}`).set(headers).expect(403);
  await api.post(`/api/lecciones/${first.id}/completar`).set(auth(accounts.student)).expect(200);
  assert.equal(await Progreso.count({ where: { inscripcionId: enrollment.id, leccionId: first.id } }), 1);
});

test("aula: un cuestionario anterior requiere aprobación; sus preguntas y claves siguen ocultas", async () => {
  const lessons = await learningLessons();
  const enrollment = await learningEnrollment();
  for (const lesson of lessons.slice(1, 3)) {
    await Progreso.create({ inscripcionId: enrollment.id, leccionId: lesson.id, completada: true });
  }
  const quiz = lessons[3];
  const saved = await Progreso.create({
    inscripcionId: enrollment.id, leccionId: quiz.id, completada: true, mejorNota: quiz.notaMinima - 1,
  });
  const quizResponse = await api.get(`/api/lecciones/${quiz.id}`).set(auth(accounts.student)).expect(200);
  for (const field of ["preguntas", "indiceCorrecto", "contenido", "videoUrl"]) {
    assert.equal(quizResponse.body[field], undefined);
  }
  await api.get(`/api/lecciones/${lessons[4].id}`).set(auth(accounts.student)).expect(403);
  await saved.update({ mejorNota: quiz.notaMinima });
  await api.get(`/api/lecciones/${lessons[4].id}`).set(auth(accounts.student)).expect(200);
});

test("aula: conserva acceso a inscritos al archivar, pero no entrega contenido en borrador", async () => {
  const course = await Curso.findByPk(1);
  const [first] = await learningLessons();
  try {
    await course.update({ estado: "archivado" });
    await api.get("/api/cursos/1").expect(404);
    await api.get("/api/cursos/1/progreso").set(auth(accounts.student)).expect(200);
    await api.get(`/api/lecciones/${first.id}`).set(auth(accounts.student)).expect(200);
    await course.update({ estado: "borrador" });
    await api.get("/api/cursos/1/progreso").set(auth(accounts.student)).expect(404);
    await api.get(`/api/lecciones/${first.id}`).set(auth(accounts.student)).expect(404);
  } finally { await course.update({ estado: "publicado" }); }
});

let completionCourse;
let completionLessons;
let completionEnrollment;

test("completar: valida sesión, rol, inscripción y no acepta progreso proporcionado por el cliente", async () => {
  const [first] = await learningLessons();
  const path = `/api/lecciones/${first.id}/completar`;
  await api.post(path).expect(401);
  await api.post(path).set(auth(accounts.teacher)).expect(403);
  await api.post(path).set(auth(accounts.student)).send({ completada: true, porcentaje: 100 }).expect(422);
  await api.post(path).set(auth(accounts.student)).send({ inscripcionId: 999, estudianteId: 1 }).expect(422);
  await api.post(`${path}?estudianteId=1`).set(auth(accounts.student)).expect(422);
  await api.post("/api/lecciones/invalido/completar").set(auth(accounts.student)).expect(422);
  await api.post("/api/lecciones/2147483647/completar").set(auth(accounts.student)).expect(404);
  const otherCourseLesson = await Leccion.findOne({ where: { cursoId: 2 } });
  await api.post(`/api/lecciones/${otherCourseLesson.id}/completar`).set(auth(accounts.student)).expect(403);
});

test("completar: rechaza saltarse la lección anterior sin escribir progreso", async () => {
  completionCourse = await Curso.create({ ...courseData, instructorId: accounts.teacher.usuario.id });
  completionLessons = [];
  for (const [index, titulo] of ["Contenido inicial", "Contenido final"].entries()) {
    completionLessons.push(await Leccion.create({
      titulo, tipo: "contenido", contenido: "Material de estudio", orden: index + 1, cursoId: completionCourse.id,
    }));
  }
  await api.patch(`/api/cursos/${completionCourse.id}/estado`).set(auth(accounts.teacher))
    .send({ estado: "publicado" }).expect(200);
  const enrolled = await api.post(`/api/cursos/${completionCourse.id}/inscripcion`).set(auth(accounts.student)).expect(201);
  completionEnrollment = enrolled.body.id;
  const blocked = await api.post(`/api/lecciones/${completionLessons[1].id}/completar`)
    .set(auth(accounts.student)).expect(403);
  assert.equal(blocked.body.error.code, "LESSON_LOCKED");
  assert.equal(await Progreso.count({ where: { inscripcionId: completionEnrollment } }), 0);
});

test("completar: guarda una lección, calcula el progreso y desbloquea la siguiente", async () => {
  const result = await api.post(`/api/lecciones/${completionLessons[0].id}/completar`)
    .set(auth(accounts.student)).expect(200);
  assert.equal(result.body.completadas, 1);
  assert.equal(result.body.total, 2);
  assert.equal(result.body.porcentaje, 50);
  assert.equal(result.body.completado, false);
  assert.equal(result.body.lecciones[0].completada, true);
  assert.equal(result.body.lecciones[1].bloqueada, false);
  const saved = await Progreso.findOne({
    where: { inscripcionId: completionEnrollment, leccionId: completionLessons[0].id },
  });
  assert.equal(saved.completada, true);
  assert.equal(saved.intentos, 0);
  assert.equal(saved.mejorNota, 0);
  await api.get(`/api/lecciones/${completionLessons[1].id}`).set(auth(accounts.student)).expect(200);
});

test("completar: repetir o recargar mantiene una sola fila y el mismo avance", async () => {
  const path = `/api/lecciones/${completionLessons[0].id}/completar`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const result = await api.post(path).set(auth(accounts.student)).send({}).expect(200);
    assert.equal(result.body.porcentaje, 50);
  }
  assert.equal(await Progreso.count({ where: { inscripcionId: completionEnrollment } }), 1);
  const reloaded = await api.get(`/api/cursos/${completionCourse.id}/progreso`).set(auth(accounts.student)).expect(200);
  assert.equal(reloaded.body.completadas, 1);
  assert.equal(reloaded.body.porcentaje, 50);
});

test("completar: al terminar todas las lecciones de contenido persiste el curso completado", async () => {
  const result = await api.post(`/api/lecciones/${completionLessons[1].id}/completar`)
    .set(auth(accounts.student)).expect(200);
  assert.equal(result.body.porcentaje, 100);
  assert.equal(result.body.completado, true);
  const enrollment = await Inscripcion.findByPk(completionEnrollment);
  assert.equal(enrollment.completado, true);
  assert.equal(await Progreso.count({ where: { inscripcionId: completionEnrollment } }), 2);
  const reloaded = await api.get(`/api/cursos/${completionCourse.id}/progreso`).set(auth(accounts.student)).expect(200);
  assert.equal(reloaded.body.completado, true);
  assert.equal(reloaded.body.porcentaje, 100);
});

test("completar: no permite completar cuestionarios ni desbloquearlos como si fueran contenido", async () => {
  const course = await Curso.create({ ...courseData, instructorId: accounts.teacher.usuario.id });
  const quiz = await Leccion.create({
    titulo: "Cuestionario obligatorio", tipo: "cuestionario", orden: 1, cursoId: course.id,
  });
  const next = await Leccion.create({
    titulo: "Después del cuestionario", tipo: "contenido", contenido: "Texto", orden: 2, cursoId: course.id,
  });
  await api.patch(`/api/cursos/${course.id}/estado`).set(auth(accounts.teacher)).send({ estado: "publicado" }).expect(200);
  const enrolled = await api.post(`/api/cursos/${course.id}/inscripcion`).set(auth(accounts.student)).expect(201);
  const response = await api.post(`/api/lecciones/${quiz.id}/completar`).set(auth(accounts.student)).expect(409);
  assert.equal(response.body.error.code, "QUIZ_REQUIRED");
  await api.post(`/api/lecciones/${next.id}/completar`).set(auth(accounts.student)).expect(403);
  assert.equal(await Progreso.count({ where: { inscripcionId: enrolled.body.id } }), 0);
});

test("completar: otro estudiante no puede modificar un curso en el que no está inscrito", async () => {
  const another = await Usuario.findOne({ where: { email: "pedro@miniaula.test" } });
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(another.id), expiresIn: "1h" });
  await api.post(`/api/lecciones/${completionLessons[0].id}/completar`)
    .set("Authorization", `Bearer ${token}`).expect(403);
  const enrollment = await Inscripcion.findByPk(completionEnrollment);
  assert.equal(enrollment.completado, true);
  assert.equal(await Progreso.count({ where: { inscripcionId: completionEnrollment } }), 2);
});

test("PostgreSQL real: completados simultáneos son idempotentes", {
  skip: process.env.API_TEST_POSTGRES !== "true" && "Requiere bloqueo de filas de PostgreSQL real.",
}, async () => {
  const course = await Curso.create({ ...courseData, instructorId: accounts.teacher.usuario.id });
  const lesson = await Leccion.create({ titulo: "Única", tipo: "contenido", contenido: "Texto", orden: 1, cursoId: course.id });
  await api.patch(`/api/cursos/${course.id}/estado`).set(auth(accounts.teacher)).send({ estado: "publicado" }).expect(200);
  const enrolled = await api.post(`/api/cursos/${course.id}/inscripcion`).set(auth(accounts.student)).expect(201);
  const responses = await Promise.all(Array.from({ length: 8 }, () =>
    api.post(`/api/lecciones/${lesson.id}/completar`).set(auth(accounts.student))));
  assert.ok(responses.every((response) => response.status === 200 && response.body.porcentaje === 100));
  assert.equal(await Progreso.count({ where: { inscripcionId: enrolled.body.id } }), 1);
  assert.equal((await Inscripcion.findByPk(enrolled.body.id)).completado, true);
});

test("mis cursos: usa el mismo resumen que el aula, sin devolver contenido ni notas", async () => {
  for (const id of [1, completionCourse.id]) {
    const listed = await api.get(`/api/inscripciones/mias?cursoId=${id}`).set(auth(accounts.student)).expect(200);
    const aula = await api.get(`/api/cursos/${id}/progreso`).set(auth(accounts.student)).expect(200);
    const { completadas, total, porcentaje, completado } = aula.body;
    assert.deepEqual(listed.body.data[0].progreso, { completadas, total, porcentaje, completado });
    assert.equal(listed.body.data[0].completado, completado);
    for (const field of ['"contenido":', '"videoUrl":', '"indiceCorrecto":', '"passwordHash":',
      '"lecciones":', '"mejorNota":', '"intentos":']) {
      assert.equal(JSON.stringify(listed.body).includes(field), false);
    }
  }
});

test("mis cursos: refleja inicio, progreso guardado, completado y curso archivado", async () => {
  const course = await Curso.create({ ...courseData, instructorId: accounts.teacher.usuario.id });
  const lessons = [];
  for (let orden = 1; orden <= 2; orden++) {
    lessons.push(await Leccion.create({
      titulo: `Paso ${orden}`, tipo: "contenido", contenido: "Material", orden, cursoId: course.id,
    }));
  }
  await api.patch(`/api/cursos/${course.id}/estado`).set(auth(accounts.teacher)).send({ estado: "publicado" }).expect(200);
  await api.post(`/api/cursos/${course.id}/inscripcion`).set(auth(accounts.student)).expect(201);
  async function listed() {
    const result = await api.get(`/api/inscripciones/mias?cursoId=${course.id}`).set(auth(accounts.student)).expect(200);
    return result.body.data[0];
  }
  assert.deepEqual((await listed()).progreso, { completadas: 0, total: 2, porcentaje: 0, completado: false });
  await api.post(`/api/lecciones/${lessons[0].id}/completar`).set(auth(accounts.student)).expect(200);
  assert.deepEqual((await listed()).progreso, { completadas: 1, total: 2, porcentaje: 50, completado: false });
  await api.post(`/api/lecciones/${lessons[1].id}/completar`).set(auth(accounts.student)).expect(200);
  assert.deepEqual((await listed()).progreso, { completadas: 2, total: 2, porcentaje: 100, completado: true });
  await api.patch(`/api/cursos/${course.id}/estado`).set(auth(accounts.teacher)).send({ estado: "archivado" }).expect(200);
  const archived = await listed();
  assert.equal(archived.curso.estado, "archivado");
  assert.equal(archived.progreso.porcentaje, 100);
  assert.equal(archived.progreso.completado, true);
});

test("mis cursos: los avances de otro estudiante no se mezclan", async () => {
  const primary = await api.get("/api/inscripciones/mias?cursoId=1").set(auth(accounts.student)).expect(200);
  assert.equal(primary.body.data[0].progreso.porcentaje, 80);
  const another = await Usuario.findOne({ where: { email: "maria@miniaula.test" } });
  const token = jwt.sign({}, process.env.JWT_SECRET, { subject: String(another.id), expiresIn: "1h" });
  const secondary = await api.get("/api/inscripciones/mias?cursoId=1")
    .set("Authorization", `Bearer ${token}`).expect(200);
  assert.equal(secondary.body.data[0].progreso.porcentaje, 0);
  assert.equal(secondary.body.data[0].progreso.completadas, 0);
});

test("mis cursos: un cuestionario no aprobado no se cuenta como completado", async () => {
  const course = await Curso.create({ ...courseData, instructorId: accounts.teacher.usuario.id });
  const quiz = await Leccion.create({
    titulo: "Evaluación", tipo: "cuestionario", orden: 1, notaMinima: 70, cursoId: course.id,
  });
  await api.patch(`/api/cursos/${course.id}/estado`).set(auth(accounts.teacher)).send({ estado: "publicado" }).expect(200);
  const enrollment = await api.post(`/api/cursos/${course.id}/inscripcion`).set(auth(accounts.student)).expect(201);
  // Fixture de nota: rendir/calificar cuestionarios aún no está implementado.
  const saved = await Progreso.create({
    inscripcionId: enrollment.body.id, leccionId: quiz.id, completada: true, mejorNota: 69,
  });
  const failed = await api.get(`/api/inscripciones/mias?cursoId=${course.id}`).set(auth(accounts.student)).expect(200);
  assert.equal(failed.body.data[0].progreso.porcentaje, 0);
  assert.equal(failed.body.data[0].completado, false);
  await saved.update({ mejorNota: 70 });
  const approved = await api.get(`/api/inscripciones/mias?cursoId=${course.id}`).set(auth(accounts.student)).expect(200);
  assert.equal(approved.body.data[0].progreso.porcentaje, 100);
  assert.equal(approved.body.data[0].completado, true);
});

test("mis cursos: ampliar la página no agrega consultas por cada curso", async () => {
  const queries = [];
  const original = sequelize.options.logging;
  sequelize.options.logging = (sql) => queries.push(sql);
  try {
    await api.get("/api/inscripciones/mias?limit=1").set(auth(accounts.student)).expect(200);
    const singleCount = queries.length;
    queries.length = 0;
    const many = await api.get("/api/inscripciones/mias?limit=50").set(auth(accounts.student)).expect(200);
    assert.ok(many.body.data.length > 1);
    assert.equal(queries.length, singleCount);
    assert.ok(queries.length <= 5, "Solo sesión, conteo, lista y dos consultas de progreso.");
  } finally { sequelize.options.logging = original; }
  const empty = await api.get("/api/inscripciones/mias?page=100000").set(auth(accounts.student)).expect(200);
  assert.deepEqual(empty.body.data, []);
});

test("resumen: maneja cursos vacíos y redondea sin dividir por cero", () => {
  const empty = summarizeProgress([], []);
  assert.equal(empty.porcentaje, 0);
  assert.equal(empty.completado, false);
  const lessons = [1, 2, 3].map((id) => ({ id, tipo: "contenido", orden: id }));
  assert.equal(summarizeProgress(lessons, [{ leccionId: 1, completada: true }]).porcentaje, 33);
  assert.equal(summarizeProgress(lessons, [
    { leccionId: 1, completada: true }, { leccionId: 2, completada: true },
  ]).porcentaje, 67);
});

let quizCourse;
let authoringQuiz;
let authoringQuestion;
const quizData = { titulo: "Evaluación del curso", tipo: "cuestionario", notaMinima: 75 };
const questionData = {
  enunciado: "¿Qué método crea un recurso?", opciones: ["GET", "POST", "DELETE"], indiceCorrecto: 1,
};
function assertNoAnswer(value) {
  assert.equal(JSON.stringify(value).includes('"indiceCorrecto":'), false);
}

test("cuestionarios: crear y editar título/nota mínima, validando el tipo y la escala", async () => {
  const course = await api.post("/api/cursos").set(auth(accounts.teacher)).send(courseData).expect(201);
  quizCourse = course.body.id;
  const path = `/api/cursos/${quizCourse}/lecciones`;
  for (const notaMinima of [-1, 101, 70.5, "70"]) {
    await api.post(path).set(auth(accounts.teacher)).send({ ...quizData, notaMinima }).expect(422);
  }
  await api.post(path).set(auth(accounts.teacher))
    .send({ ...quizData, contenido: "No corresponde a un cuestionario" }).expect(422);
  const created = await api.post(path).set(auth(accounts.teacher)).send(quizData).expect(201);
  authoringQuiz = created.body.id;
  assert.equal(created.body.tipo, "cuestionario");
  assert.equal(created.body.notaMinima, 75);
  assert.equal(created.body.contenido, null);
  assert.equal(created.body.videoUrl, null);
  const updated = await api.put(`/api/lecciones/${authoringQuiz}`).set(auth(accounts.teacher))
    .send({ ...quizData, titulo: "Evaluación editada", notaMinima: 80 }).expect(200);
  assert.equal(updated.body.notaMinima, 80);
  await api.put(`/api/lecciones/${authoringQuiz}`).set(auth(accounts.teacher))
    .send({ titulo: "Cambio de tipo", tipo: "contenido", contenido: "Texto" }).expect(409);
  await api.put(`/api/lecciones/${authoringQuiz}`).set(auth(accounts.other)).send(quizData).expect(403);
});

test("preguntas: crear guarda la clave solo en BD y nunca la retorna", async () => {
  const response = await api.post(`/api/lecciones/${authoringQuiz}/preguntas`)
    .set(auth(accounts.teacher)).send(questionData).expect(201);
  authoringQuestion = response.body.id;
  assert.deepEqual(Object.keys(response.body).sort(), ["enunciado", "id", "leccionId", "opciones"]);
  assertNoAnswer(response.body);
  const stored = await Pregunta.unscoped().findByPk(authoringQuestion);
  assert.equal(stored.indiceCorrecto, 1);
  assert.deepEqual(stored.opciones, questionData.opciones);
});

test("preguntas: valida opciones, clave, enunciado, parámetros y query antes de escribir", async () => {
  const path = `/api/lecciones/${authoringQuiz}/preguntas`;
  const invalid = [
    { opciones: ["Solo una"] }, { opciones: Array.from({ length: 7 }, (_, index) => `Opción ${index}`) },
    { opciones: ["GET", " get "] }, { opciones: ["GET", ""] },
    { indiceCorrecto: -1 }, { indiceCorrecto: 3 }, { indiceCorrecto: 0.5 }, { indiceCorrecto: "1" },
    { enunciado: "" }, { enunciado: "x".repeat(2001) }, { leccionId: 1 }, { id: 999 },
  ];
  for (const change of invalid) {
    await api.post(path).set(auth(accounts.teacher)).send({ ...questionData, ...change }).expect(422);
  }
  for (const query of ["page=0", "limit=51", "indiceCorrecto=1", "extra=1"]) {
    await api.get(`${path}?${query}`).set(auth(accounts.teacher)).expect(422);
  }
  await api.get("/api/lecciones/error/preguntas").set(auth(accounts.teacher)).expect(422);
  await api.get("/api/lecciones/2147483647/preguntas").set(auth(accounts.teacher)).expect(404);
  await api.put("/api/preguntas/2147483647").set(auth(accounts.teacher)).send(questionData).expect(404);
  await api.delete("/api/preguntas/2147483647").set(auth(accounts.teacher)).expect(404);
  assert.equal(await Pregunta.count({ where: { leccionId: authoringQuiz } }), 1);
});

test("preguntas: listado paginado con nota mínima y sin respuestas correctas", async () => {
  await api.post(`/api/lecciones/${authoringQuiz}/preguntas`).set(auth(accounts.teacher))
    .send({ ...questionData, enunciado: "Segunda pregunta" }).expect(201);
  const first = await api.get(`/api/lecciones/${authoringQuiz}/preguntas?page=1&limit=1`)
    .set(auth(accounts.teacher)).expect(200);
  const second = await api.get(`/api/lecciones/${authoringQuiz}/preguntas?page=2&limit=1`)
    .set(auth(accounts.teacher)).expect(200);
  assert.equal(first.body.pagination.total, 2);
  assert.equal(first.body.pagination.pages, 2);
  assert.equal(first.body.leccion.notaMinima, 80);
  assert.equal(first.body.leccion.cursoId, quizCourse);
  assert.notEqual(first.body.data[0].id, second.body.data[0].id);
  assertNoAnswer(first.body);
  assertNoAnswer(second.body);
});

test("preguntas: editar exige volver a indicar la respuesta y la guarda sin devolverla", async () => {
  const updated = { enunciado: "¿Qué significa crear?", opciones: ["POST", "GET"], indiceCorrecto: 0 };
  const response = await api.put(`/api/preguntas/${authoringQuestion}`).set(auth(accounts.teacher))
    .send(updated).expect(200);
  assert.equal(response.body.enunciado, updated.enunciado);
  assertNoAnswer(response.body);
  assert.equal((await Pregunta.unscoped().findByPk(authoringQuestion)).indiceCorrecto, 0);
  await api.put(`/api/preguntas/${authoringQuestion}`).set(auth(accounts.teacher))
    .send({ enunciado: "Sin clave", opciones: ["A", "B"] }).expect(422);
});

test("preguntas: autenticación, rol y propiedad se validan en todas las operaciones", async () => {
  const listPath = `/api/lecciones/${authoringQuiz}/preguntas`;
  for (const credentials of [null, accounts.student, accounts.other]) {
    const status = credentials ? 403 : 401;
    let list = api.get(listPath);
    let create = api.post(listPath).send(questionData);
    let update = api.put(`/api/preguntas/${authoringQuestion}`).send(questionData);
    let remove = api.delete(`/api/preguntas/${authoringQuestion}`);
    if (credentials) {
      const headers = auth(credentials);
      list = list.set(headers); create = create.set(headers);
      update = update.set(headers); remove = remove.set(headers);
    }
    await list.expect(status); await create.expect(status);
    await update.expect(status); await remove.expect(status);
  }
});

test("preguntas: una lección de contenido no puede recibir preguntas", async () => {
  const lesson = await api.post(`/api/cursos/${quizCourse}/lecciones`).set(auth(accounts.teacher))
    .send({ titulo: "Solo contenido", contenido: "Material de estudio" }).expect(201);
  await api.get(`/api/lecciones/${lesson.body.id}/preguntas`).set(auth(accounts.teacher)).expect(409);
  await api.post(`/api/lecciones/${lesson.body.id}/preguntas`).set(auth(accounts.teacher))
    .send(questionData).expect(409);
});

test("preguntas: eliminar una pregunta y eliminar una lección limpian solo sus recursos", async () => {
  await api.delete(`/api/preguntas/${authoringQuestion}`).set(auth(accounts.teacher)).expect(204);
  assert.equal(await Pregunta.findByPk(authoringQuestion), null);
  const lesson = await api.post(`/api/cursos/${quizCourse}/lecciones`).set(auth(accounts.teacher))
    .send({ ...quizData, titulo: "Temporal para eliminar" }).expect(201);
  await api.post(`/api/lecciones/${lesson.body.id}/preguntas`).set(auth(accounts.teacher))
    .send(questionData).expect(201);
  await api.delete(`/api/lecciones/${lesson.body.id}`).set(auth(accounts.teacher)).expect(204);
  assert.equal(await Pregunta.count({ where: { leccionId: lesson.body.id } }), 0);
  assert.equal(await Pregunta.count({ where: { leccionId: authoringQuiz } }), 1);
});

test("preguntas: un curso inscrito conserva preguntas y nota; claves tampoco salen al estudiante", async () => {
  await api.patch(`/api/cursos/${quizCourse}/estado`).set(auth(accounts.teacher)).send({ estado: "publicado" }).expect(200);
  await api.post(`/api/cursos/${quizCourse}/inscripcion`).set(auth(accounts.student)).expect(201);
  const listPath = `/api/lecciones/${authoringQuiz}/preguntas`;
  const listed = await api.get(listPath).set(auth(accounts.teacher)).expect(200);
  const id = listed.body.data[0].id;
  await api.post(listPath).set(auth(accounts.teacher)).send(questionData).expect(409);
  await api.put(`/api/preguntas/${id}`).set(auth(accounts.teacher)).send(questionData).expect(409);
  await api.delete(`/api/preguntas/${id}`).set(auth(accounts.teacher)).expect(409);
  await api.put(`/api/lecciones/${authoringQuiz}`).set(auth(accounts.teacher))
    .send({ ...quizData, notaMinima: 20 }).expect(409);
  const privateList = await api.get(listPath).set(auth(accounts.teacher)).expect(200);
  assert.equal(privateList.body.leccion.notaMinima, 80);
  assertNoAnswer(privateList.body);
  const lesson = await api.get(`/api/lecciones/${authoringQuiz}`).set(auth(accounts.student)).expect(200);
  assertNoAnswer(lesson.body);
  assert.equal(lesson.body.preguntas, undefined);
  const detail = await api.get(`/api/cursos/${quizCourse}`).expect(200);
  assertNoAnswer(detail.body);
});

test("preguntas: el máximo se comprueba bajo bloqueo del curso", async () => {
  const course = await api.post("/api/cursos").set(auth(accounts.teacher)).send(courseData).expect(201);
  const lesson = await api.post(`/api/cursos/${course.body.id}/lecciones`).set(auth(accounts.teacher))
    .send(quizData).expect(201);
  await Pregunta.bulkCreate(Array.from({ length: 100 }, (_, index) => ({
    ...questionData, enunciado: `Pregunta ${index + 1}`, leccionId: lesson.body.id,
  })));
  const response = await api.post(`/api/lecciones/${lesson.body.id}/preguntas`).set(auth(accounts.teacher))
    .send(questionData).expect(409);
  assert.equal(response.body.error.code, "QUESTION_LIMIT");
  assert.equal(await Pregunta.count({ where: { leccionId: lesson.body.id } }), 100);
});
