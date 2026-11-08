import type { PublishedMethod } from "../queries";
import { formatPublishedOn, methodSections } from "../vocabulary";

// null while the editors have not published the page: the links to it must still lead somewhere.
export function MethodArticle({ method }: { method: PublishedMethod | null }) {
  if (!method) {
    return <p className="text-muted-foreground">La méthode de Poli. sera publiée ici prochainement.</p>;
  }

  return (
    <article className="flex flex-col gap-10">
      {methodSections.map((section) => (
        <section key={section.key} className="flex flex-col gap-3">
          <h2 className="font-heading text-xl font-semibold tracking-tight">{section.title}</h2>
          <p className="whitespace-pre-line text-pretty">{method[section.key]}</p>
        </section>
      ))}
      <p className="text-sm text-muted-foreground">Dernière mise à jour le {formatPublishedOn(method.publishedAt)}.</p>
    </article>
  );
}
