import { type TextNature, textNatureLabels } from "./text-natures";

const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "UTC" });

// How the Assemblée names a text: "Projet de loi n° 105".
export function textReference({ nature, number }: { nature: TextNature; number: number }): string {
  return `${textNatureLabels[nature]} n°\u00a0${number}`;
}

// The date has no time, so it is read and shown in UTC: no time zone can move it by a day.
export function formatFiledOn(isoDate: string): string {
  return longDate.format(new Date(`${isoDate}T00:00:00Z`));
}
