// How the Assemblée names an amendment: "Amendement n° 12".
export function amendmentReference({ number }: { number: number }): string {
  return `Amendement n°\u00a0${number}`;
}

