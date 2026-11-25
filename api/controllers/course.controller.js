import * as courses from "../services/course.service.js";
import { courseSummary } from "../services/statistics.service.js";

export const list = async (req, res) => res.json(await courses.listCourses(req.validated.query));
export const categories = async (req, res) => res.json(await courses.categories());
export const detail = async (req, res) => res.json(await courses.publicDetail(req.validated.params.id));
export const mine = async (req, res) => res.json(await courses.listCourses(req.validated.query, req.user.id));
export const editDetail = async (req, res) => res.json(await courses.privateDetail(req.course.id));
export const summary = async (req, res) => res.json(await courseSummary(req.course));
export const create = async (req, res) => res.status(201).json(await courses.createCourse(req.validated.body, req.user.id));
export const update = async (req, res) => res.json(await courses.updateCourse(req.course, req.validated.body));
export const state = async (req, res) => res.json(await courses.changeState(req.course.id, req.validated.body.estado));
export const remove = async (req, res) => {
  await courses.deleteCourse(req.course.id);
  res.sendStatus(204);
};
