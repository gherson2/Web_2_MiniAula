import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { frontendOrigin } from "./config/env.js";
import welcomeRoutes from "./routes/index.routes.js";
import authRoutes from "./routes/auth.routes.js";
import courseRoutes from "./routes/course.routes.js";
import enrollmentRoutes from "./routes/enrollment.routes.js";
import { openapi } from "./docs/openapi.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import { AppError } from "./utils/AppError.js";

export const app = express();
app.disable("x-powered-by");
// Nginx es el único salto de proxy de Compose y reemplaza X-Forwarded-For.
if (process.env.BEHIND_PROXY === "true") app.set("trust proxy", 1);
app.use(helmet());
app.use(cors({ origin: frontendOrigin }));
app.use(morgan("dev", { skip: () => process.env.NODE_ENV === "test" }));
app.use(express.json({ limit: "100kb" }));
app.get("/api/docs.json", (req, res) => res.json(openapi));
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openapi));
app.use("/api", welcomeRoutes, authRoutes, courseRoutes);
app.use("/api", enrollmentRoutes);
app.use((req, res, next) => next(new AppError(404, "NOT_FOUND", "La ruta no existe.")));
app.use(errorHandler);
