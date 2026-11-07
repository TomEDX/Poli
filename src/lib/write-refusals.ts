export type RefusalReasons<Reason extends string> = {
  // The reason each unique constraint stands for, by constraint name.
  taken?: Record<string, Reason>;
  // What a broken foreign key means to the editor: on a write, a row picked in the form was
  // deleted meanwhile ("not-found"); on a delete, content still points at the row ("in-use").
  foreignKey?: Reason;
};

const uniqueViolation = "23505";

const foreignKeyViolation = "23503";

/**
 * The reason the editor reads for a failed write: the one it was refused with, or the one
 * the broken constraint stands for. Rethrows anything the editor cannot act on.
 */
export function refusalOf<Reason extends string>(error: unknown, { taken = {}, foreignKey }: RefusalReasons<Reason>): Reason {
  if (error instanceof Refused) return error.reason as Reason;
  const { code, constraint } = postgresError(error);
  const reason =
    code === uniqueViolation && constraint ? taken[constraint] : code === foreignKeyViolation ? foreignKey : undefined;
  if (reason === undefined) throw error;
  return reason;
}

// Thrown inside a transaction to roll it back with the reason the editor will read.
export class Refused<Reason extends string> extends Error {
  constructor(readonly reason: Reason) {
    super(reason);
  }
}

// Drizzle wraps the driver error and keeps the Postgres one as its cause.
function postgresError(error: unknown): { code?: string; constraint?: string } {
  const { cause, code } = error as { cause?: { code?: string; constraint_name?: string }; code?: string };
  return { code: cause?.code ?? code, constraint: cause?.constraint_name };
}
