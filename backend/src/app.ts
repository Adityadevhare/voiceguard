import cors from "cors";
import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { env } from "./config/env.js";
import healthRoutes from "./routes/health.routes.js";

const app = express();

app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(express.json());

app.use("/api", healthRoutes);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

app.use(
  (error: Error, _req: Request, res: Response, _next: NextFunction): void => {
    console.error("Unhandled error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  },
);

export default app;