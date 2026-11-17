import { AppError } from "../utils/AppError.js";

export function validate(schemas) {
  return (req, res, next) => {
    req.validated = {};
    for (const [source, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[source]);
      if (!result.success) {
        return next(new AppError(422, "VALIDATION_ERROR", "Revisa los datos enviados.",
          result.error.issues.map(({ path, message }) => ({
            field: [source, ...path].join("."), message,
          }))));
      }
      req.validated[source] = result.data;
    }
    next();
  };
}
