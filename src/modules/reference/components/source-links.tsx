import { ExternalLink } from "lucide-react";

import type { SourceSummary } from "../sources";

// The sources a content was linked to, as links to the documents; nothing when it has none.
export function SourceLinks({ sources }: { sources: SourceSummary[] }) {
  if (sources.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5 text-sm">
      <p className="text-xs font-semibold text-muted-foreground">{sources.length > 1 ? "Sources" : "Source"}</p>
      <ul className="flex flex-col gap-1">
        {sources.map((source) => (
          <li key={source.id}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              {source.title}
              <ExternalLink aria-hidden className="ml-1 inline size-3.5 align-baseline" />
              <span className="sr-only"> (nouvel onglet)</span>
            </a>
            <span className="text-muted-foreground"> · {source.organization}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
