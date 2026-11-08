import { z } from "zod";

import { stances } from "./vocabulary";

const stanceField = z
  .number({ error: "Choisissez une position sur l’échelle, ou « pas de position »." })
  .refine((value) => (stances as readonly number[]).includes(value), "Choisissez une position sur l’échelle, ou « pas de position ».")
  .transform((value) => value as (typeof stances)[number]);

// The positions of a question, one per candidacy entered; a candidacy left out has none yet.
// A candidacy given twice is left to the unique constraint, which refuses it.
export const positionsField = z.array(
  z.object({
    candidacyId: z.uuid(),
    value: stanceField.nullable(),
    sourceId: z.uuid().nullable().default(null),
  }),
);
