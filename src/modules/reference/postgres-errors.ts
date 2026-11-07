export const uniqueViolation = "23505";
export const foreignKeyViolation = "23503";

// Drizzle wraps the driver error and keeps the Postgres one as its cause.
export function postgresError(error: unknown): { code?: string; constraint?: string } {
  const { cause, code } = error as { cause?: { code?: string; constraint_name?: string }; code?: string };
  return { code: cause?.code ?? code, constraint: cause?.constraint_name };
}
