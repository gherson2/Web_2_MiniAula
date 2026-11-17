import { z } from "zod";

const text = (max) => z.string().trim().min(1, "Este campo es obligatorio.").max(max);
const email = z.string().trim().email("Email inválido.").max(255).transform((v) => v.toLowerCase());
const password = z.string().min(8, "Usa al menos 8 caracteres.").max(72)
  .refine((v) => Buffer.byteLength(v, "utf8") <= 72, "La contraseña supera 72 bytes.");
const positiveId = z.coerce.number().int().positive().max(2147483647);

export const idParams = z.object({ id: positiveId }).strict();
export const emptyQuery = z.object({}).strict();
export const emptyBody = z.object({}).strict();
export const registerBody = z.object({
  nombre: text(100), email, password, rol: z.enum(["estudiante", "instructor"]),
}).strict();
export const loginBody = z.object({
  email, password: z.string().min(1).max(200),
}).strict();
export const profileBody = z.object({ nombre: text(100), email }).strict();
export const courseBody = z.object({
  titulo: text(150), descripcion: text(10000), categoria: text(80),
  nivel: z.enum(["basico", "intermedio", "avanzado"]),
}).strict();
export const catalogQuery = z.object({
  q: z.string().trim().max(150).default(""),
  categoria: z.string().trim().max(80).default(""),
  page: positiveId.default(1),
  limit: z.coerce.number().int().min(1).max(50).default(6),
}).strict();
export const stateBody = z.object({ estado: z.enum(["publicado", "archivado"]) }).strict();
export const lessonBody = z.object({
  titulo: text(150),
  contenido: z.string().trim().max(50000).default(""),
  videoUrl: z.union([z.literal(""), z.string().url().max(2048)
    .refine((v) => ["http:", "https:"].includes(new URL(v).protocol), "Usa http o https.")]).default(""),
}).strict().refine((v) => v.contenido.length > 0 || v.videoUrl.length > 0, {
  message: "Escribe contenido o agrega un enlace a video.", path: ["contenido"],
});
export const orderBody = z.object({
  lecciones: z.array(positiveId).min(1).max(500)
    .refine((ids) => new Set(ids).size === ids.length, "No repitas lecciones."),
}).strict();
