import { z } from "zod";

export const SECTION_MAX_LENGTH = 10000;

// A draft may leave a section empty; the public page needs all three.
export const methodDraftSchema = z.object({
  candidacyCriteria: sectionField(),
  textCriteria: sectionField(),
  scoreFormula: sectionField(),
});

export const publishedMethodSchema = z.object({
  candidacyCriteria: sectionField("Rédigez le critère de choix des candidatures."),
  textCriteria: sectionField("Rédigez le critère de choix des textes."),
  scoreFormula: sectionField("Rédigez la formule du score d’accord."),
});

function sectionField(missing?: string) {
  const field = z.string().trim();
  return (missing ? field.min(1, missing) : field).max(
    SECTION_MAX_LENGTH,
    `Une partie dépasse ${SECTION_MAX_LENGTH} caractères.`,
  );
}
