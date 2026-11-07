import { z } from "zod";

import { numberField, officialUrlField, optionalIdField, sourceIdsField } from "./form-fields";
import { completeCounts, type GroupCounts } from "./group-counts";
import { groupPositions, voteResults, voteSubjects } from "./vote-kinds";
import type { GroupVoteInput } from "./votes";

// Blank when not entered. Four digits are more than the Assemblée has members.
const countField = z.coerce
  .string()
  .trim()
  .regex(/^\d{0,4}$/, "Un décompte est un nombre entier, positif ou nul.")
  .transform((count) => (count === "" ? null : Number(count)));

const countsField = z
  .object({ for: countField, against: countField, abstention: countField, nonVoting: countField })
  .transform((counts): GroupCounts | null | "partial" => {
    if (Object.values(counts).every((count) => count === null)) return null;
    return completeCounts(counts) ?? "partial";
  })
  .refine((counts) => counts !== "partial", "Saisissez les quatre nombres du décompte d’un groupe, ou aucun.")
  .transform((counts) => (counts === "partial" ? null : counts));

const groupVoteField = z
  .object({
    groupId: z.uuid(),
    position: z.enum(groupPositions, { error: "Choisissez la position majoritaire de chaque groupe." }),
    counts: countsField.nullable().default(null),
  })
  .refine(isCoherent, {
    message: "Le décompte d’un groupe ne correspond pas à sa position majoritaire.",
    path: ["counts"],
  });

// A scrutin with every group vote, as the form sends it on a creation and on an edit. Only a
// scrutin on an amendment keeps the amendment it was linked to, blank for none.
export const voteSchema = z
  .object({
    subject: z.enum(voteSubjects, { error: "Choisissez l’objet du scrutin." }),
    number: numberField({ missing: "Saisissez le numéro du scrutin.", label: "Le numéro du scrutin" }),
    heldOn: z.iso.date({ error: "Saisissez la date du scrutin." }),
    result: z.enum(voteResults, { error: "Choisissez le résultat du scrutin." }),
    officialUrl: officialUrlField,
    amendmentId: optionalIdField.default(null),
    groupVotes: z.array(groupVoteField),
    // Left out, the scrutin keeps its sources, so a save that does not send them erases none.
    sourceIds: sourceIdsField.optional(),
  })
  .transform((vote) => (vote.subject === "amendment" ? vote : { ...vote, amendmentId: null }));

// The majority position is the one with the most votes among for, against and abstention,
// a tie included; members who did not vote may outnumber it. A group whose majority did
// not vote has no member voting for, against or abstaining.
function isCoherent({ position, counts }: GroupVoteInput): boolean {
  if (!counts) return true;
  const expressed = { for: counts.for, against: counts.against, abstention: counts.abstention };
  const others = Object.values(expressed);
  if (position === "non_voting") return others.every((count) => count === 0);
  return others.every((count) => expressed[position] >= count);
}
