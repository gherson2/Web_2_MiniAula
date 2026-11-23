const string = { type: "string" };
const object = (properties, required = Object.keys(properties)) => ({ type: "object", properties, required, additionalProperties: false });
const body = (schema) => ({ required: true, content: { "application/json": { schema } } });
const id = { in: "path", name: "id", required: true, schema: { type: "integer", minimum: 1 } };
const query = [
  { in: "query", name: "q", schema: string },
  { in: "query", name: "categoria", schema: string },
  { in: "query", name: "page", schema: { type: "integer", minimum: 1, default: 1 } },
  { in: "query", name: "limit", schema: { type: "integer", minimum: 1, maximum: 50, default: 6 } },
];
const course = object({
  titulo: string, descripcion: string, categoria: string,
  nivel: { type: "string", enum: ["basico", "intermedio", "avanzado"] },
});
const lesson = object({ titulo: string, contenido: string, videoUrl: string }, ["titulo"]);
function operation(summary, { auth = false, params = [], schema, status = 200 } = {}) {
  return {
    summary, security: auth ? [{ bearerAuth: [] }] : [], parameters: params,
    ...(schema ? { requestBody: body(schema) } : {}),
    responses: {
      [status]: { description: status === 204 ? "Eliminado, sin cuerpo" : "Operación correcta" },
      401: { $ref: "#/components/responses/Error" }, 403: { $ref: "#/components/responses/Error" },
      404: { $ref: "#/components/responses/Error" }, 409: { $ref: "#/components/responses/Error" },
      422: { $ref: "#/components/responses/Error" }, 429: { $ref: "#/components/responses/Error" },
    },
  };
}

export const openapi = {
  openapi: "3.0.3",
  info: { title: "MiniAula — progreso del estudiante", version: "0.5.1",
    description: "Inscripción, lectura de contenido desbloqueado y guardado de lecciones completadas. La API calcula el progreso y desbloquea secuencialmente. Un cuestionario no se puede completar por esta vía: rendir/calificar, porcentaje en Mis cursos y estadísticas siguen pendientes." },
  servers: [{ url: "/api" }],
  components: {
    securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } },
    responses: {
      Error: {
        description: "Error normalizado",
        content: {
          "application/json": {
            schema: object({ error: object({ code: string, message: string, details: { nullable: true } }) }),
          },
        },
      },
    },
  },
  paths: {
    "/": { get: operation("Comprobar API") },
    "/auth/register": { post: operation("Registrarse", { status: 201, schema: object({
      nombre: string, email: { type: "string", format: "email" },
      password: { type: "string", minLength: 8, maxLength: 72 },
      rol: { type: "string", enum: ["estudiante", "instructor"] },
    }) }) },
    "/auth/login": { post: operation("Iniciar sesión", { schema: object({ email: string, password: string }) }) },
    "/users/me": {
      get: operation("Ver mi perfil", { auth: true }),
      put: operation("Editar nombre y email (no permite cambiar rol)", {
        auth: true, schema: object({ nombre: string, email: string }),
      }),
    },
    "/categorias": { get: operation("Categorías de cursos publicados") },
    "/cursos": {
      get: operation("Catálogo público: solo publicados", { params: query }),
      post: operation("Crear curso en borrador (instructor)", { auth: true, schema: course, status: 201 }),
    },
    "/cursos/{id}": {
      get: operation("Detalle público y temario, sin contenido ni respuestas", { params: [id] }),
      put: operation("Editar curso propio", { auth: true, params: [id], schema: course }),
      delete: operation("Eliminar curso propio sin inscritos", { auth: true, params: [id], status: 204 }),
    },
    "/instructor/cursos": { get: operation("Listar mis cursos, incluidos borradores", { auth: true, params: query }) },
    "/instructor/cursos/{id}": { get: operation("Contenido de mi curso para edición", { auth: true, params: [id] }) },
    "/cursos/{id}/estado": { patch: operation("Publicar (mínimo una lección) o archivar", {
      auth: true, params: [id], schema: object({ estado: { type: "string", enum: ["publicado", "archivado"] } }),
    }) },
    "/cursos/{id}/lecciones": { post: operation("Crear lección de contenido en curso propio", {
      auth: true, params: [id], schema: lesson, status: 201,
    }) },
    "/cursos/{id}/lecciones/orden": { patch: operation("Ordenar: enviar TODOS los IDs en el orden deseado", {
      auth: true, params: [id], schema: object({ lecciones: { type: "array", uniqueItems: true, minItems: 1, items: { type: "integer" } } }),
    }) },
    "/lecciones/{id}": {
      get: operation("Leer lección (estudiante inscrito). 403 si bloqueada; nunca revela claves de preguntas.", {
        auth: true, params: [id],
      }),
      put: operation("Editar lección de contenido propia", { auth: true, params: [id], schema: lesson }),
      delete: operation("Eliminar lección propia (no la última de un curso publicado)", { auth: true, params: [id], status: 204 }),
    },
    "/cursos/{id}/inscripcion": {
      post: operation("Inscribirme en un curso publicado (estudiante). Sin cuerpo; duplicados: 409.", {
        auth: true, params: [id], status: 201,
      }),
    },
    "/inscripciones/mias": {
      get: operation("Mis inscripciones: solo las del estudiante autenticado, sin contenido ni progreso", {
        auth: true, params: [
          ...query.filter((item) => ["page", "limit"].includes(item.name)),
          { in: "query", name: "cursoId", schema: { type: "integer", minimum: 1 } },
        ],
      }),
    },
    "/cursos/{id}/progreso": {
      get: operation("Mi temario, completadas, total, porcentaje y completado, sin contenido de lecciones.", {
        auth: true, params: [id],
      }),
    },
    "/lecciones/{id}/completar": {
      post: operation("Completar contenido desbloqueado y recibir progreso actualizado. Sin cuerpo; repetible sin duplicar. 403 bloqueada, 409 cuestionario.", {
        auth: true, params: [id],
      }),
    },
  },
};
