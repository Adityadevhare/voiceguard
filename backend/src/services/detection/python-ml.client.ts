import { z } from "zod";
import { AppError } from "../../errors/AppError.js";
import type { DetectionInput, VoiceStatus } from "../../types/detection.js";

export interface PythonMlClientOptions {
  timeoutMs?: number;
  predictPath?: string;
}

const CLASSIFICATION_TO_STATUS: Record<"bonafide" | "spoof", VoiceStatus> = {
  bonafide: "human",
  spoof: "ai",
};

const mlResponseSchema = z.object({
  success: z.literal(true),
  model: z.string().min(1),
  result: z.object({
    classification: z.enum(["bonafide", "spoof"]),
    logit0: z.number(),
    logit1: z.number(),
    inferenceTimeMs: z.number(),
  }),
});

export interface MlPrediction {
  status: VoiceStatus;
  model: string;
  logit0: number;
  logit1: number;
  inferenceTimeMs: number;
}

export class PythonMlClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly predictPath: string;

  constructor(baseUrl: string, options: PythonMlClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.predictPath = options.predictPath ?? "/predict";
  }

  async predict(payload: DetectionInput): Promise<MlPrediction> {
    const audioBuffer = Buffer.from(payload.audio, "base64");

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(audioBuffer)], {
      type: "audio/wav",
    });
    formData.append("audio", blob, "audio.wav");

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${this.predictPath}`, {
        method: "POST",
        body: formData,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw AppError.mlTimeout();
      }
      throw AppError.mlUnavailable();
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      let detail: string | undefined;
      try {
        const body = (await response.json()) as { detail?: string };
        detail = body.detail;
      } catch {
        // ignore parse failure
      }
      if (response.status === 400) {
        throw AppError.badRequest(detail ?? "ML service rejected the audio input.");
      }
      throw AppError.mlUnavailable();
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw AppError.mlInvalidResponse();
    }

    const parsed = mlResponseSchema.safeParse(data);
    if (!parsed.success) {
      throw AppError.mlInvalidResponse();
    }

    const status = CLASSIFICATION_TO_STATUS[parsed.data.result.classification];

    return {
      status,
      model: parsed.data.model,
      logit0: parsed.data.result.logit0,
      logit1: parsed.data.result.logit1,
      inferenceTimeMs: parsed.data.result.inferenceTimeMs,
    };
  }
}
