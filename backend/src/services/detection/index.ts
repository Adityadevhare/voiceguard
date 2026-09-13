import { env } from "../../config/env.js";
import { DetectionService } from "./detection.service.js";
import { PythonMlDetectionEngine } from "./detection.engine.js";
import { PythonMlClient } from "./python-ml.client.js";

function createDetectionService(): DetectionService {
  if (env.ML_SERVICE_URL === undefined) {
    return new DetectionService(null);
  }

  const client = new PythonMlClient(env.ML_SERVICE_URL, {
    timeoutMs: env.ML_SERVICE_TIMEOUT_MS,
  });
  const engine = new PythonMlDetectionEngine(client);

  return new DetectionService(engine);
}

export const detectionService = createDetectionService();