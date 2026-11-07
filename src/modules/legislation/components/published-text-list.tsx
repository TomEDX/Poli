import Link from "next/link";

import { formatFiledOn, textReference } from "../text-labels";
import type { PublishedTextSummary } from "../texts";

// The public list of texts; each entry leads to the page of its text.
export function PublishedTextList({ texts }: { texts: PublishedTextSummary[] }) {
  if (texts.length === 0) {
    return <p className="text-muted-foreground">Aucun texte n’est encore publié.</p>;
  }

  return (
    <ul className="flex flex-col divide-y overflow-hidden rounded-xl border">
      {texts.map((text) => (
        <li key={text.id}>
          <Link
            href={`/textes/${text.id}`}
            className="flex flex-col gap-1 px-4 py-4 outline-none hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
          >
            <span className="text-sm text-muted-foreground">
              {textReference(text)} · déposé le {formatFiledOn(text.filedOn)}
            </span>
            <span className="font-medium text-pretty">{text.officialTitle}</span>
            <span className="text-sm text-muted-foreground">
              {text.subtopics.map((subtopic) => subtopic.name).join(" · ")}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
