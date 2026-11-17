import { Router } from "express";
import rateLimit from "express-rate-limit";
import * as controller from "../controllers/auth.controller.js";
import { authenticate } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { registerBody, loginBody, profileBody, emptyQuery } from "../validators/schemas.js";
import { AppError } from "../utils/AppError.js";

const router = Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false,
  handler: (req, res, next) => next(new AppError(429, "RATE_LIMIT", "Demasiados intentos. Espera 15 minutos.")),
});
router.post("/auth/register", limiter, validate({ body: registerBody, query: emptyQuery }), controller.register);
router.post("/auth/login", limiter, validate({ body: loginBody, query: emptyQuery }), controller.login);
router.get("/users/me", authenticate, validate({ query: emptyQuery }), controller.me);
router.put("/users/me", authenticate, validate({ body: profileBody, query: emptyQuery }), controller.updateMe);
export default router;
