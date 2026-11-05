import { z } from "zod";

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replaceAll("œ", "oe")
    .replaceAll("æ", "ae")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const topicFormSchema = z
  .object({
    name: z.string().trim().min(1, "Saisissez un nom.").max(80, "Le nom dépasse 80 caractères."),
    slug: z.string().trim(),
  })
  .transform(({ name, slug }) => ({ name, slug: slugify(slug || name) }))
  .refine(({ slug }) => slug !== "", {
    message: "Le nom doit contenir au moins une lettre ou un chiffre.",
    path: ["name"],
  });
