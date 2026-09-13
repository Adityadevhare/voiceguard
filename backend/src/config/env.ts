import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(5000),
  CORS_ORIGIN: z.string().url().default("http://localhost:5173"),
  ML_SERVICE_URL: z.string().url().optional(),
  ML_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(10_000),
  REQUEST_BODY_LIMIT: z.string().default("6mb"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:");
  for (const issue of parsed.error.issues) {
    console.error(`  - ${issue.path.join(".") || "(root)"}: ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;