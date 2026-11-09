// The comparator stays readable on a phone with three candidacies side by side, not more.
export const MAX_COMPARED_CANDIDACIES = 3;

export const nothingInProgrammeMessage = "Rien dans le programme sur ce sujet";

export const addressedByNoneMessage = "Aucune des candidatures choisies n’en parle";

// Under the party's name, at the head of a column, while the party has no declared candidate.
export const partyCandidacyLabel = "Candidature du parti";

const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

// The date has no time, so it is read and shown in UTC: no time zone can move it by a day.
export function formatRecordedOn(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T00:00:00Z`));
}
