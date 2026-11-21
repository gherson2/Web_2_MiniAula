import { Router } from "express";
import * as controller from "../controllers/enrollment.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParams, emptyQuery, emptyBody, enrollmentQuery } from "../validators/schemas.js";

const router = Router();
const student = [authenticate, requireRole("estudiante")];
router.post("/cursos/:id/inscripcion", ...student, validate({
  params: idParams, query: emptyQuery, body: emptyBody.default({}),
}), controller.enroll);
router.get("/inscripciones/mias", ...student, validate({ query: enrollmentQuery }), controller.mine);
export default router;
