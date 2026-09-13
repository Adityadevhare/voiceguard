import { z } from "zod";
import { AppError } from "../../errors/AppError.js";
import { VOICE_STATUSES, type DetectionInput } from "../../types/detection.js";

export interface PythonMlClientOptions {
  timeoutMs?: number;
  predictPath?: string;
}

const mlResponseSchema = z.object({
  result: z.enum(VOICE_STATUSES),
  modelVersion: z.string().min(1).optional(),
});

type MlResponse = z.infer<typeof mlResponseSchema>;

export class PythonMlClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly predictPath: string;

  constructor(baseUrl: string, options: PythonMlClientOptions = {}) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.predictPath = options.predictPath ?? "/predict";
  }

  async predict(payload: DetectionInput): Promise<MlResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${this.predictPath}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audio: payload.audio }),
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

    return parsed.data;
  }
}