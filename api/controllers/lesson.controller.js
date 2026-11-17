import * as lessons from "../services/lesson.service.js";

export const create = async (req, res) => res.status(201).json(await lessons.createLesson(req.course.id, req.validated.body));
export const update = async (req, res) => res.json(await lessons.updateLesson(req.lesson, req.validated.body));
export const remove = async (req, res) => {
  await lessons.deleteLesson(req.lesson);
  res.sendStatus(204);
};
export const reorder = async (req, res) => res.json(await lessons.reorderLessons(req.course.id, req.validated.body.lecciones));
