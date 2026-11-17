
import { Router } from "express";
import { getWelcome } from "../controllers/index.controller.js";

const router = Router();

router.get("/", getWelcome);

export default router;
