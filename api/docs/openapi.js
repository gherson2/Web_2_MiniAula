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
const lesson = object({
  titulo: string,
  tipo: { type: "string", enum: ["contenido", "cuestionario"], default: "contenido" },
  contenido: string, videoUrl: string,
  notaMinima: { type: "integer", minimum: 0, maximum: 100, default: 70 },
}, ["titulo"]);
const question = object({
  enunciado: { type: "string", minLength: 1, maxLength: 2000 },
  opciones: { type: "array", minItems: 2, maxItems: 6, uniqueItems: true,
    items: { type: "string", minLength: 1, maxLength: 500 } },
  indiceCorrecto: { type: "integer", minimum: 0, maximum: 5, writeOnly: true },
});
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
  info: { title: "MiniAula — cursos, evaluaciones y estadísticas", version: "1.0.0",
    description: "Cursos, progreso secuencial, cuestionarios con calificación en servidor y estadísticas privadas del instructor. Hasta tres intentos por estudiante y cuestionario; se conserva la mejor nota y la aprobación. Las claves nunca se devuelven por HTTP, tampoco al instructor. El tipo de lección es inmutable y los cursos inscritos conservan su estructura y preguntas." },
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
    "/instructor/cursos/{id}/resumen": { get: {
      ...operation("Estadísticas agregadas de mi curso: inscritos, progreso, mejores notas y primera lección pendiente", {
        auth: true, params: [id],
      }),
      description: "Solo el instructor propietario. progresoPromedio incluye a todos los inscritos; sin inscritos es 0. notaPromedio promedia la mejor nota de cada cuestionario intentado por estudiante, excluyendo los no intentados; sin intentos es null. detenciones cuenta la primera lección pendiente por estudiante, no abandono. No incluye identidades ni notas individuales.",
    } },
    "/cursos/{id}/estado": { patch: operation("Publicar (mínimo una lección y preguntas en cada cuestionario) o archivar", {
      auth: true, params: [id], schema: object({ estado: { type: "string", enum: ["publicado", "archivado"] } }),
    }) },
    "/cursos/{id}/lecciones": { post: operation("Crear contenido o cuestionario con nota mínima en curso propio", {
      auth: true, params: [id], schema: lesson, status: 201,
    }) },
    "/cursos/{id}/lecciones/orden": { patch: operation("Ordenar: enviar TODOS los IDs en el orden deseado", {
      auth: true, params: [id], schema: object({ lecciones: { type: "array", uniqueItems: true, minItems: 1, items: { type: "integer" } } }),
    }) },
    "/lecciones/{id}": {
      get: operation("Leer lección (estudiante inscrito). 403 si bloqueada; nunca revela claves de preguntas.", {
        auth: true, params: [id],
      }),
      put: operation("Editar contenido o título/nota mínima de cuestionario propio, sin cambiar su tipo", { auth: true, params: [id], schema: lesson }),
      delete: operation("Eliminar lección propia (no la última de un curso publicado)", { auth: true, params: [id], status: 204 }),
    },
    "/cursos/{id}/inscripcion": {
      post: operation("Inscribirme en un curso publicado (estudiante). Sin cuerpo; duplicados: 409.", {
        auth: true, params: [id], status: 201,
      }),
    },
    "/inscripciones/mias": {
      get: operation("Mis cursos con progreso privado: completadas, total, porcentaje y completado; sin contenido ni respuestas", {
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
    "/lecciones/{id}/intentos": {
      post: {
        ...operation("Rendir cuestionario desbloqueado: nota calculada en servidor y progreso actualizado", {
          auth: true, params: [id], schema: object({
            respuestas: { type: "array", minItems: 1, maxItems: 100,
              items: object({
                preguntaId: { type: "integer", minimum: 1 },
                indiceElegido: { type: "integer", minimum: 0, maximum: 5 },
              }) },
          }),
        }),
        description: "Enviar exactamente una respuesta por pregunta, con índices desde cero. Rechaza preguntas ajenas, repetidas u opciones inexistentes con 422 sin consumir intentos. Máximo tres envíos válidos, incluso después de aprobar; agotados devuelve 409. Se bloquea la inscripción en una transacción. Devuelve nota (0–100, redondeada), aprobado (comparación exacta sin redondeo), mejorNota, intentos, intentosRestantes y progreso. Una nota menor no elimina la aprobación. Nunca devuelve claves ni correcciones por pregunta. Un error de conexión puede ocurrir después de guardar: consultar progreso antes de reenviar.",
      },
    },
    "/lecciones/{id}/preguntas": {
      get: operation("Preguntas de mi cuestionario, sin clave correcta; incluye metadatos y paginación", {
        auth: true, params: [id, ...query.filter((item) => ["page", "limit"].includes(item.name))
          .map((item) => item.name === "limit" ? { ...item, schema: { ...item.schema, default: 10 } } : item)],
      }),
      post: operation("Crear pregunta en cuestionario propio (máximo 100). Solo retorna campos sin clave", {
        auth: true, params: [id], schema: question, status: 201,
      }),
    },
    "/preguntas/{id}": {
      put: operation("Editar pregunta propia; volver a proporcionar la clave correcta", {
        auth: true, params: [id], schema: question,
      }),
      delete: operation("Eliminar pregunta propia sin inscritos en el curso", {
        auth: true, params: [id], status: 204,
      }),
    },
  },
};
