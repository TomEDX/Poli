import { revalidatePath } from "next/cache";
import type { z } from "zod";

import { getCurrentEditor } from "./authorization";

export type ActionResult = { ok: true } | { ok: false; message: string };

// unchanged means nothing was written, so the public pages stay as they are.
export type WriteOutcome<Reason extends string> = { ok: true; unchanged?: true } | { ok: false; reason: Reason };

type Parsed<Schemas extends readonly z.ZodType[]> = { -readonly [Index in keyof Schemas]: z.output<Schemas[Index]> };

// The validated arguments, followed by the form input when there is one.
type Params<Args extends readonly z.ZodType[], Input> = Input extends z.ZodType
  ? [...Parsed<Args>, z.output<Input>]
  : Parsed<Args>;

type Message<P extends readonly unknown[]> = string | ((...params: P) => string);

type DefaultReason = "not-found";

// Every failure reason needs a message, except those with a default one.
type Messages<Reason extends string, P extends readonly unknown[]> = {
  [R in Exclude<Reason, DefaultReason>]: Message<P>;
} & { [R in Extract<Reason, DefaultReason>]?: Message<P> };

const sessionExpired: ActionResult = { ok: false, message: "Votre session a expiré : reconnectez-vous." };
const invalidRequest: ActionResult = { ok: false, message: "Requête invalide : rechargez la page." };
const defaultMessages: Record<DefaultReason, string> = {
  "not-found": "Cet élément n'existe plus : rechargez la page.",
};

/**
 * Builds a Server Action that writes as an editor. The app writes as postgres, which the
 * Supabase access rules do not cover, so this check is what keeps visitors out (ADR 0007).
 *
 * In order: checks the editor, validates what the client sent (args by position, then the
 * optional form input passed last), runs the write, turns a failure reason into its message,
 * and regenerates the public pages after a change (ADR 0005). Unexpected errors are thrown.
 */
export function editorWrite<
  const Args extends readonly z.ZodType[],
  Reason extends string,
  Input extends z.ZodType | undefined = undefined,
>(definition: {
  args: Args;
  input?: Input;
  run: (...params: Params<Args, Input>) => Promise<WriteOutcome<Reason>>;
  messages?: Messages<Reason, Params<Args, Input>>;
}) {
  return async (...raw: unknown[]): Promise<ActionResult> => {
    if (!(await getCurrentEditor())) return sessionExpired;

    const parsed = parseParams(definition.args, definition.input, raw);
    if (!parsed.ok) return parsed.result;
    const params = parsed.params as Params<Args, Input>;

    const outcome = await definition.run(...params);
    if (!outcome.ok) {
      return { ok: false, message: failureMessage(definition.messages ?? {}, outcome.reason, params) };
    }
    if (!outcome.unchanged) revalidatePath("/", "layout");
    return { ok: true };
  };
}

function parseParams(
  args: readonly z.ZodType[],
  input: z.ZodType | undefined,
  raw: unknown[],
): { ok: true; params: unknown[] } | { ok: false; result: ActionResult } {
  const params: unknown[] = [];
  for (const [index, schema] of args.entries()) {
    const arg = schema.safeParse(raw[index]);
    if (!arg.success) return { ok: false, result: invalidRequest };
    params.push(arg.data);
  }
  if (input) {
    // Form errors are written for the editor, so the first one is shown as is.
    const values = input.safeParse(raw[args.length]);
    if (!values.success) return { ok: false, result: { ok: false, message: values.error.issues[0].message } };
    params.push(values.data);
  }
  return { ok: true, params };
}

function failureMessage<P extends readonly unknown[]>(
  messages: Partial<Record<string, Message<P>>>,
  reason: string,
  params: P,
): string {
  const message = messages[reason] ?? defaultMessages[reason as DefaultReason];
  if (message === undefined) throw new Error(`No message for the write failure "${reason}".`);
  return typeof message === "string" ? message : message(...params);
}
