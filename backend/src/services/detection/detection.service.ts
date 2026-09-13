import { AppError } from "../../errors/AppError.js";
import type { DetectionEngine } from "./detection.engine.js";
import type { DetectionInput, DetectionResult } from "../../types/detection.js";

export class DetectionService {
  constructor(private readonly engine: DetectionEngine | null) {}

  async detect(input: DetectionInput): Promise<DetectionResult> {
    if (this.engine === null) {
      throw AppError.mlUnavailable();
    }

    const startedAt = Date.now();
    const result = await this.engine.detect(input);
    const elapsedMs = Date.now() - startedAt;

    return {
      ...result,
      processingTimeMs: result.processingTimeMs ?? elapsedMs,
    };
  }
}