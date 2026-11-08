import { PartyLogo } from "@/modules/reference/parties/components/party-logo";
import type { PublishedCandidacy } from "@/modules/reference/parties/queries";
import { SourceLinks } from "@/modules/reference/sources/components/source-links";

import { formatRecordedOn, nothingInProgrammeMessage } from "../vocabulary";
import type { ComparedExtract, ComparisonGrid } from "../queries";

// Side by side on a wide screen; on a phone each subtopic stacks its candidacies, every cell
// named, so three stay readable.
const columns: Record<number, string> = { 1: "", 2: "md:grid-cols-2", 3: "md:grid-cols-2 lg:grid-cols-3" };

/**
 * The programmes of the chosen candidacies on one topic, subtopic by subtopic. Every
 * candidacy gets the same neutral card, in the order the visitor chose them.
 */
export function ComparisonTable({
  topic,
  candidacies,
}: {
  topic: ComparisonGrid[number];
  candidacies: PublishedCandidacy[];
}) {
  return (
    <div className="flex flex-col gap-8">
      {topic.subtopics.map((subtopic) => (
        <section key={subtopic.id} aria-labelledby={`subtopic-${subtopic.id}`} className="flex flex-col gap-3">
          <h3 id={`subtopic-${subtopic.id}`} className="font-heading text-lg font-semibold">
            {subtopic.name}
          </h3>
          <ul className={`grid gap-3 ${columns[subtopic.cells.length] ?? ""}`}>
            {subtopic.cells.map((cell) => {
              const candidacy = candidacies.find((candidate) => candidate.id === cell.candidacyId);
              if (!candidacy) return null;
              return (
                <li key={cell.candidacyId} className="flex flex-col gap-4 rounded-xl border bg-card p-4">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    <span aria-hidden>
                      <PartyLogo party={candidacy.party} className="size-8" />
                    </span>
                    {candidacy.label}
                  </p>
                  {cell.extracts.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">{nothingInProgrammeMessage}</p>
                  ) : (
                    cell.extracts.map((extract) => <Extract key={extract.id} extract={extract} />)
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

function Extract({ extract }: { extract: ComparedExtract }) {
  return (
    <figure className="flex flex-col gap-2">
      <blockquote className="border-l-2 pl-3 text-pretty whitespace-pre-line">« {extract.quote} »</blockquote>
      <figcaption className="text-xs text-muted-foreground">Relevé le {formatRecordedOn(extract.recordedOn)}</figcaption>
      <SourceLinks sources={extract.sources} />
    </figure>
  );
}
