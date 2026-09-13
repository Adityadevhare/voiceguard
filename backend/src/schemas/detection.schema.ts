import { z } from "zod";

export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

export const MAX_AUDIO_BASE64_LENGTH = Math.ceil(MAX_AUDIO_BYTES / 3) * 4;

export const detectionRequestSchema = z
  .object({
    audio: z
      .string({ message: "audio must be a non-empty string" })
      .min(1, "audio must not be empty")
      .max(
        MAX_AUDIO_BASE64_LENGTH,
        `audio exceeds the maximum allowed size (${MAX_AUDIO_BYTES} bytes payload encoded as base64)`,
      ),
  })
  .strict();

export type DetectionRequest = z.infer<typeof detectionRequestSchema>;