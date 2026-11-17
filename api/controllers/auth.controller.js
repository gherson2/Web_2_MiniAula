import * as auth from "../services/auth.service.js";

export const register = async (req, res) => res.status(201).json(await auth.register(req.validated.body));
export const login = async (req, res) => res.json(await auth.login(req.validated.body));
export const me = (req, res) => res.json(auth.publicUser(req.user));
export const updateMe = async (req, res) => res.json(await auth.updateProfile(req.user, req.validated.body));
