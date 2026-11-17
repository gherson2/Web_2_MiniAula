import { AppError } from "../utils/AppError.js";

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error.name === "SequelizeUniqueConstraintError") {
    error = new AppError(409, "CONFLICT", "Ya existe un registro con esos datos.");
  }
  if (error.type === "entity.parse.failed") {
    error = new AppError(400, "INVALID_JSON", "El JSON enviado no es válido.");
  }
  if (error.type === "entity.too.large") {
    error = new AppError(413, "PAYLOAD_TOO_LARGE", "La solicitud es demasiado grande.");
  }
  if (!(error instanceof AppError)) {
    console.error("Error interno:", error.name);
    error = new AppError(500, "INTERNAL_ERROR", "Ocurrió un error interno.");
  }
  res.status(error.status).json({
    error: { code: error.code, message: error.message, details: error.details },
  });
}
