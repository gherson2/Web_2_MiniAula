import jwt from "jsonwebtoken";
import { Usuario, Curso, Leccion } from "../models/index.js";
import { AppError } from "../utils/AppError.js";

export async function authenticate(req, res, next) {
  const match = /^Bearer ([^\s]+)$/.exec(req.headers.authorization || "");
  if (!match) throw new AppError(401, "UNAUTHORIZED", "Inicia sesión para continuar.");
  let payload;
  try {
    payload = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw new AppError(401, "INVALID_TOKEN", "Tu sesión venció o no es válida.");
  }
  const user = await Usuario.findByPk(payload.sub);
  if (!user) throw new AppError(401, "INVALID_TOKEN", "La sesión ya no es válida.");
  req.user = user;
  next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user.rol !== role) {
      throw new AppError(403, "FORBIDDEN", "Tu rol no tiene permiso para esta acción.");
    }
    next();
  };
}

export async function ownCourse(req, res, next) {
  const course = await Curso.findByPk(req.validated.params.id);
  if (!course) throw new AppError(404, "NOT_FOUND", "El curso no existe.");
  if (course.instructorId !== req.user.id) {
    throw new AppError(403, "NOT_OWNER", "Solo puedes modificar tus propios cursos.");
  }
  req.course = course;
  next();
}

export async function ownLesson(req, res, next) {
  const lesson = await Leccion.findByPk(req.validated.params.id, {
    include: [{ model: Curso, as: "curso" }],
  });
  if (!lesson) throw new AppError(404, "NOT_FOUND", "La lección no existe.");
  if (lesson.curso.instructorId !== req.user.id) {
    throw new AppError(403, "NOT_OWNER", "Solo puedes modificar tus propias lecciones.");
  }
  req.lesson = lesson;
  next();
}
