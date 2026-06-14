const AUTH_LOG_PREFIX = "[Auth]";

export type AuthLogContext = Record<string, unknown>;

export type NormalizedAuthError = {
  name?: string;
  message: string;
  status?: number;
  code?: string;
  stack?: string;
};

function extractErrorLike(
  error: Error & { status?: number; code?: string }
): NormalizedAuthError {
  const normalized: NormalizedAuthError = {
    name: error.name,
    message: error.message || "Unknown auth error",
    stack: error.stack,
  };

  if (typeof error.status === "number") {
    normalized.status = error.status;
  }

  if (typeof error.code === "string") {
    normalized.code = error.code;
  }

  return normalized;
}

export function normalizeAuthLogError(error: unknown): NormalizedAuthError {
  if (typeof error === "string") {
    return { message: error };
  }

  if (error instanceof Error) {
    return extractErrorLike(error);
  }

  if (
    typeof error === "object"
    && error !== null
    && "message" in error
    && typeof (error as { message: unknown }).message === "string"
  ) {
    return extractErrorLike(
      error as Error & { status?: number; code?: string }
    );
  }

  try {
    const serialized = JSON.stringify(error);
    if (serialized && serialized !== "{}") {
      return { message: serialized };
    }
  } catch {
    // Circular structures are not JSON-serializable.
  }

  return {
    message: String(error ?? "Unknown auth error"),
  };
}

export function logAuthInfo(
  phase: string,
  context?: AuthLogContext
): void {
  console.info(AUTH_LOG_PREFIX, phase, context ?? {});
}

export function logAuthWarn(
  phase: string,
  context?: AuthLogContext
): void {
  console.warn(AUTH_LOG_PREFIX, phase, context ?? {});
}

export function logAuthError(
  phase: string,
  error: unknown,
  context?: AuthLogContext
): void {
  const normalized = normalizeAuthLogError(error);

  // Handled auth failures are expected during login/bootstrap. console.error
  // triggers the Next.js dev overlay even inside try/catch.
  console.warn(AUTH_LOG_PREFIX, `${phase}: ${normalized.message}`, {
    ...context,
    error: normalized,
  });
}
