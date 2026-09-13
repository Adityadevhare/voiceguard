import {
  VERDICT_PROFILES,
  type DetectionInput,
  type DetectionResult,
} from "../../types/detection.js";
import type { PythonMlClient } from "./python-ml.client.js";

export interface DetectionEngine {
  readonly name: string;
  detect(input: DetectionInput): Promise<DetectionResult>;
}

export class PythonMlDetectionEngine implements DetectionEngine {
  readonly name = "python-ml";

  constructor(private readonly client: PythonMlClient) {}

  async detect(input: DetectionInput): Promise<DetectionResult> {
    const prediction = await this.client.predict(input);
    const profile = VERDICT_PROFILES[prediction.result];
    return {
      result: prediction.result,
      riskLevel: profile.riskLevel,
      message: profile.message,
      ...(prediction.modelVersion !== undefined
        ? { modelVersion: prediction.modelVersion }
        : {}),
    };
  }
}