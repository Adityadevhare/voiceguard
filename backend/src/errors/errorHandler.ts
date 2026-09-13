import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "./AppError.js";

function bodyParserType(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const type = (error as { type?: unknown }).type;
  return typeof type === "string" ? type : undefined;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof AppError) {
    console.warn(`[voiceguard] ${error.code}: ${error.message}`);
    res.status(error.statusCode).json({
      success: false,
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const detail = firstIssue ? firstIssue.message : "no details";
    console.warn(`[voiceguard] VALIDATION_ERROR: ${detail}`);
    res.status(422).json({
      success: false,
      error: { code: "VALIDATION_ERROR", message: "Invalid request payload." },
    });
    return;
  }

  const parserType = bodyParserType(error);
  if (parserType === "entity.too.large") {
    console.warn("[voiceguard] PAYLOAD_TOO_LARGE: request body exceeds configured limit");
    res.status(413).json({
      success: false,
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body exceeds the allowed size.",
      },
    });
    return;
  }

  if (parserType === "entity.parse.failed") {
    console.warn("[voiceguard] INVALID_JSON: request body is not valid JSON");
    res.status(400).json({
      success: false,
      error: { code: "INVALID_JSON", message: "Request body contains invalid JSON." },
    });
    return;
  }

  const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
  console.error("[voiceguard] INTERNAL_ERROR: unexpected failure", detail);
  res.status(500).json({
    success: false,
    error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." },
  });
};