import { foreignKeyViolation, postgresError, uniqueViolation } from "@/modules/reference/postgres-errors";

// Thrown inside a transaction to roll it back with the reason the editor will read.
export class Refused<Reason extends string> extends Error {
  constructor(readonly reason: Reason) {
    super(reason);
  }
}

/**
 * The reason the editor reads for a failed write: the one it was refused with, the one the
 * unique constraint it broke stands for, or "not-found" when a row it points to, picked in
 * the form, was deleted meanwhile. Rethrows anything the editor cannot act on.
 */
export function refusalOf<Reason extends string>(
  error: unknown,
  takenReasons: Record<string, Reason>,
): Reason | "not-found" {
  if (error instanceof Refused) return error.reason as Reason;
  const { code, constraint } = postgresError(error);
  const taken = code === uniqueViolation && constraint ? takenReasons[constraint] : undefined;
  if (taken) return taken;
  if (code === foreignKeyViolation) return "not-found";
  throw error;
}
