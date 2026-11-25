import * as questions from "../services/question.service.js";

export const list = async (req, res) => res.json(
  await questions.listQuestions(req.lesson, req.validated.query),
);
export const create = async (req, res) => res.status(201).json(
  await questions.createQuestion(req.lesson, req.validated.body),
);
export const update = async (req, res) => res.json(
  await questions.updateQuestion(req.question.id, req.lesson, req.validated.body),
);
export const remove = async (req, res) => {
  await questions.deleteQuestion(req.question.id, req.lesson);
  res.sendStatus(204);
};
