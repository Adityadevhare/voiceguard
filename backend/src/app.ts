import cors from "cors";
import express, { type Request, type Response } from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./errors/errorHandler.js";
import detectionRoutes from "./routes/detection.routes.js";
import healthRoutes from "./routes/health.routes.js";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json({ limit: env.REQUEST_BODY_LIMIT }));

app.use("/api", healthRoutes);
app.use("/api", detectionRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
});

app.use(errorHandler);

export default app;