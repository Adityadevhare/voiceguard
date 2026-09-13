import type { Request, Response } from "express";
import { AppError } from "../errors/AppError.js";
import { detectionRequestSchema } from "../schemas/detection.schema.js";
import { detectionService } from "../services/detection/index.js";
import type { DetectionResult } from "../types/detection.js";

function serializeResult(result: DetectionResult): {
  result: DetectionResult["result"];
  riskLevel: DetectionResult["riskLevel"];
  message: string;
  modelVersion?: string;
  processingTime?: number;
} {
  const { modelVersion, processingTimeMs, ...rest } = result;
  return {
    ...rest,
    ...(modelVersion !== undefined ? { modelVersion } : {}),
    ...(processingTimeMs !== undefined ? { processingTime: processingTimeMs } : {}),
  };
}

export async function detectAudio(req: Request, res: Response): Promise<void> {
  console.info("[voiceguard] DETECTION_REQUEST: received");

  const parsed = detectionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.validation();
  }

  const result = await detectionService.detect({ audio: parsed.data.audio });

  res.status(200).json({
    success: true,
    data: serializeResult(result),
  });
}