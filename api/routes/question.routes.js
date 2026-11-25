import { Router } from "express";
import * as controller from "../controllers/question.controller.js";
import { authenticate, requireRole, ownLesson, ownQuestion } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { idParams, emptyQuery, questionBody, questionQuery } from "../validators/schemas.js";

const router = Router();
const instructor = [authenticate, requireRole("instructor")];
const params = { params: idParams, query: emptyQuery };
router.get("/lecciones/:id/preguntas", ...instructor,
  validate({ params: idParams, query: questionQuery }), ownLesson, controller.list);
router.post("/lecciones/:id/preguntas", ...instructor,
  validate({ ...params, body: questionBody }), ownLesson, controller.create);
router.put("/preguntas/:id", ...instructor,
  validate({ ...params, body: questionBody }), ownQuestion, controller.update);
router.delete("/preguntas/:id", ...instructor, validate(params), ownQuestion, controller.remove);
export default router;
