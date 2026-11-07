import Link from "next/link";

import { formatFiledOn, textReference } from "../vocabulary";
import type { PublishedTextSummary } from "../queries";

// The public list of texts; each entry leads to the page of its text. The count is a status,
// so screen readers announce it when the filters change the list.
export function PublishedTextList({ texts, narrowed }: { texts: PublishedTextSummary[]; narrowed: boolean }) {
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="text-sm text-muted-foreground">
        {count(texts.length, narrowed)}
      </p>
      {texts.length > 0 && <TextEntries texts={texts} />}
    </div>
  );
}

function count(found: number, narrowed: boolean): string {
  if (found === 0) {
    return narrowed ? "Aucun texte publié ne correspond à ces filtres." : "Aucun texte n’est encore publié.";
  }
  return found === 1 ? "1 texte" : `${found} textes`;
}

function TextEntries({ texts }: { texts: PublishedTextSummary[] }) {
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
