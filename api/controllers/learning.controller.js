import * as learning from "../services/learning.service.js";

export const progress = async (req, res) => res.json(await learning.courseProgress(req.enrollment));
export const lesson = async (req, res) => res.json(
  await learning.readLesson(req.enrollment, req.validated.params.id),
);
export const complete = async (req, res) => res.json(
  await learning.completeLesson(req.enrollment, req.validated.params.id),
);
export const attempt = async (req, res) => res.json(
  await learning.submitAttempt(req.enrollment, req.validated.params.id, req.validated.body),
);
