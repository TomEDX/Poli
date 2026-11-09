import { ListTreeIcon } from "lucide-react";
import type { CSSProperties } from "react";

import type { PublishedCandidacy } from "@/modules/reference/parties/queries";
import { SourceLinks } from "@/modules/reference/sources/components/source-links";

import { CandidacyName } from "./candidacy-name";
import { TopicIcon } from "./topic-icon";
import {
  subtopicAttribute,
  subtopicSectionId,
  topicAttribute,
  topicSectionId,
  topicTitleAttribute,
} from "./use-reading-position";
import { type ComparedSubtopic, type ComparedTopic, isAddressedByNone } from "../comparison-grid";
import type { ComparedExtract } from "../queries";
import { addressedByNoneMessage, formatRecordedOn, nothingInProgrammeMessage } from "../vocabulary";

// The same grid for the pinned names and for the extracts, so each name stays over its column.
export function candidacyColumns(count: number): CSSProperties {
  return { gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))` };
}

/**
 * One topic of the comparison, its title pinned under the names while it is read. On a wide
 * screen the candidacies are side by side under their pinned names; on a phone each extract
 * goes in a card named after its candidacy.
 */
export function ComparisonSection({
  topic,
  candidacies,
  onOpenOutline,
}: {
  topic: ComparedTopic;
  candidacies: PublishedCandidacy[];
  onOpenOutline: () => void;
}) {
  const titleId = `${topicSectionId(topic.slug)}-title`;
  return (
    <section
      id={topicSectionId(topic.slug)}
      {...{ [topicAttribute]: topic.slug }}
      aria-labelledby={titleId}
      // No top padding, so the title is pinned as soon as the section reaches the names; the
      // last topic is tall enough for its title to get there.
      className="flex flex-col gap-6 pb-10 last:min-h-[calc(100dvh-var(--pinned-names,0px))]"
    >
      <div
        {...{ [topicTitleAttribute]: "" }}
        className="sticky top-[var(--pinned-names,0px)] z-10 -mx-4 flex min-h-14 items-center gap-3 bg-background/95 px-4 py-2 backdrop-blur md:mx-0 md:px-0"
      >
        <h2
          id={titleId}
          className="flex min-w-0 flex-1 items-center gap-2 font-heading text-xl font-semibold tracking-tight md:text-2xl"
        >
          <TopicIcon slug={topic.slug} className="size-6 shrink-0" />
          {topic.name}
        </h2>
        <button
          type="button"
          onClick={onOpenOutline}
          className="flex h-9 shrink-0 items-center gap-1.5 rounded-full border bg-background px-3 text-sm md:hidden"
        >
          <ListTreeIcon aria-hidden className="size-4" />
          Sommaire
        </button>
      </div>
      {topic.subtopics.map((subtopic) =>
        isAddressedByNone(subtopic) ? (
          <p
            key={subtopic.id}
            id={subtopicSectionId(subtopic.id)}
            {...{ [subtopicAttribute]: subtopic.id }}
            className="border-b border-dashed py-2 text-sm text-muted-foreground"
          >
            <span className="font-medium text-foreground/70">{subtopic.name}</span>
            {" · "}
            <span className="italic">{addressedByNoneMessage}</span>
          </p>
        ) : (
          <Subtopic key={subtopic.id} subtopic={subtopic} candidacies={candidacies} />
        ),
      )}
    </section>
  );
}

function Subtopic({ subtopic, candidacies }: { subtopic: ComparedSubtopic; candidacies: PublishedCandidacy[] }) {
  const titleId = `${subtopicSectionId(subtopic.id)}-title`;
  return (
    <section
      id={subtopicSectionId(subtopic.id)}
      {...{ [subtopicAttribute]: subtopic.id }}
      aria-labelledby={titleId}
      className="flex flex-col gap-3"
    >
      <h3
        id={titleId}
        className="sticky top-[calc(var(--pinned-names,0px)_+_var(--pinned-topic,0px))] z-[5] -mx-4 border-b bg-background/95 px-4 py-2 font-heading text-lg font-semibold backdrop-blur md:mx-0 md:px-0"
      >
        {subtopic.name}
      </h3>
      <div className="hidden gap-4 md:grid" style={candidacyColumns(subtopic.cells.length)}>
        {subtopic.cells.map((cell) => (
          <div key={cell.candidacyId} className="flex flex-col gap-4 rounded-xl bg-muted/40 p-4">
            <Extracts extracts={cell.extracts} />
          </div>
        ))}
      </div>
      <ul className="flex flex-col gap-3 md:hidden">
        {subtopic.cells.map((cell) => {
          const candidacy = candidacies.find((candidate) => candidate.id === cell.candidacyId);
          if (!candidacy) return null;
          return (
            <li key={cell.candidacyId} className="flex flex-col gap-4 rounded-xl border bg-card p-4">
              <p className="flex items-center gap-2 text-sm font-medium">
                <CandidacyName candidacy={candidacy} />
              </p>
              <Extracts extracts={cell.extracts} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Extracts({ extracts }: { extracts: ComparedExtract[] }) {
  if (extracts.length === 0) {
    return <p className="text-sm text-muted-foreground italic">{nothingInProgrammeMessage}</p>;
  }
  return extracts.map((extract) => (
    <figure key={extract.id} className="flex flex-col gap-2">
      <blockquote className="border-l-2 pl-3 text-pretty whitespace-pre-line">« {extract.quote} »</blockquote>
      <figcaption className="text-xs text-muted-foreground">Relevé le {formatRecordedOn(extract.recordedOn)}</figcaption>
      <SourceLinks sources={extract.sources} />
    </figure>
  ));
}
