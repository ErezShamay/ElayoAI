const AUTH_LOG_PREFIX = "[Auth]";

export type AuthLogContext = Record<string, unknown>;

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
  const normalized =
    error instanceof Error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : { value: error };

  console.error(AUTH_LOG_PREFIX, phase, {
    ...context,
    error: normalized,
  });
}
