export type MethodSections = {
  candidacyCriteria: string;
  textCriteria: string;
  scoreFormula: string;
};

export type MethodSectionKey = keyof MethodSections;

// In the order the page shows them: who is compared, what was voted, then how the quiz scores.
export const methodSections: { key: MethodSectionKey; title: string; hint: string }[] = [
  {
    key: "candidacyCriteria",
    title: "Le choix des candidatures",
    hint: "Quelles candidatures Poli. présente, et pourquoi.",
  },
  {
    key: "textCriteria",
    title: "Le choix des textes",
    hint: "Quels textes de l’Assemblée Poli. retient, et pourquoi.",
  },
  {
    key: "scoreFormula",
    title: "La formule du score d’accord",
    hint: "Comment le quiz calcule le score, assez précisément pour le vérifier à la main.",
  },
];

const longDate = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Europe/Paris" });

export function formatPublishedOn(publishedAt: Date): string {
  return longDate.format(publishedAt);
}
