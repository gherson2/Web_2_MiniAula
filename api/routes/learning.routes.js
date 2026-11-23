import { Router } from "express";
import * as controller from "../controllers/learning.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.middleware.js";
import { enrolledCourse, enrolledLesson } from "../middlewares/learning.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParams, emptyQuery, emptyBody } from "../validators/schemas.js";

const router = Router();
const student = [authenticate, requireRole("estudiante")];
const params = { params: idParams, query: emptyQuery };
router.get("/cursos/:id/progreso", ...student, validate(params), enrolledCourse, controller.progress);
router.get("/lecciones/:id", ...student, validate(params), enrolledLesson, controller.lesson);
router.post("/lecciones/:id/completar", ...student,
  validate({ ...params, body: emptyBody.default({}) }), enrolledLesson, controller.complete);
export default router;
