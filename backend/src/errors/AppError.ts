export type AppErrorCode =
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "INVALID_JSON"
  | "PAYLOAD_TOO_LARGE"
  | "ML_SERVICE_UNAVAILABLE"
  | "ML_SERVICE_TIMEOUT"
  | "ML_SERVICE_INVALID_RESPONSE"
  | "DETECTION_FAILED"
  | "INTERNAL_ERROR"
  | "NOT_FOUND";

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly statusCode: number;

  constructor(code: AppErrorCode, message: string, statusCode: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
  }

  static validation(message = "Invalid request payload."): AppError {
    return new AppError("VALIDATION_ERROR", message, 422);
  }

  static badRequest(message = "Invalid request."): AppError {
    return new AppError("BAD_REQUEST", message, 400);
  }

  static mlUnavailable(message = "Voice analysis is temporarily unavailable."): AppError {
    return new AppError("ML_SERVICE_UNAVAILABLE", message, 503);
  }

  static mlTimeout(message = "Voice analysis timed out. Please try again."): AppError {
    return new AppError("ML_SERVICE_TIMEOUT", message, 503);
  }

  static mlInvalidResponse(
    message = "Voice analysis returned an invalid response.",
  ): AppError {
    return new AppError("ML_SERVICE_INVALID_RESPONSE", message, 502);
  }

  static payloadTooLarge(message = "Request body exceeds the allowed size."): AppError {
    return new AppError("PAYLOAD_TOO_LARGE", message, 413);
  }

  static notFound(message = "Route not found."): AppError {
    return new AppError("NOT_FOUND", message, 404);
  }

  static internal(message = "An unexpected error occurred."): AppError {
    return new AppError("INTERNAL_ERROR", message, 500);
  }
}