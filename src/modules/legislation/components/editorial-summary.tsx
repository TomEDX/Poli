import { useId } from "react";

// Always labelled as written by Poli., so that no one mistakes it for the official text.
export function EditorialSummary({ summary }: { summary: string }) {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2 rounded-xl border bg-muted/40 p-5">
      <h2 id={headingId} className="text-sm font-semibold">
        Résumé éditorial
      </h2>
      <p className="text-xs text-muted-foreground">
        Rédigé par l’équipe de Poli. en langage courant ; il ne remplace pas le texte officiel.
      </p>
      <p className="whitespace-pre-line text-pretty">{summary}</p>
    </section>
  );
}
