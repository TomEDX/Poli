import { ExternalLink } from "lucide-react";

import { formatFiledOn, textReference } from "../vocabulary";
import type { PublishedText } from "../queries";

// What identifies a text: its reference, official title, filing date, subtopics and official page.
export function TextHeader({ text }: { text: PublishedText }) {
  return (
    <header className="flex flex-col gap-4">
      <p className="text-sm font-medium text-muted-foreground">{textReference(text)}</p>
      <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance md:text-3xl">
        {text.officialTitle}
      </h1>
      <p className="text-sm text-muted-foreground">Déposé le {formatFiledOn(text.filedOn)}</p>
      {text.subtopics.length > 0 && (
        <ul aria-label="Sous-thématiques" className="flex flex-wrap gap-2">
          {text.subtopics.map((subtopic) => (
            <li key={subtopic.id} className="rounded-full border px-3 py-1 text-sm">
              <span className="text-muted-foreground">{subtopic.topic.name} · </span>
              {subtopic.name}
            </li>
          ))}
        </ul>
      )}
      {text.officialUrl && (
        <p>
          <a
            href={text.officialUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm text-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Consulter la page officielle du texte
            <ExternalLink aria-hidden className="ml-1 inline size-3.5 align-baseline" />
            <span className="sr-only"> (nouvel onglet)</span>
          </a>
        </p>
      )}
    </header>
  );
}
