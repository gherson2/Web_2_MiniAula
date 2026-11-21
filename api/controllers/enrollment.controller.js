import * as enrollments from "../services/enrollment.service.js";

export const enroll = async (req, res) => res.status(201).json(
  await enrollments.enroll(req.validated.params.id, req.user.id),
);
export const mine = async (req, res) => res.json(
  await enrollments.myEnrollments(req.user.id, req.validated.query),
);
