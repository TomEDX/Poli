export type LabelledCandidacy = { candidateName: string | null; party: { name: string; abbreviation: string } };

// Shared by the public pages and the administration, so both always show the same name.
export function candidacyLabel({ candidateName, party }: LabelledCandidacy): string {
  return candidateName === null ? party.name : `${candidateName} (${party.abbreviation})`;
}
