import { ExternalLink } from "lucide-react";
import { useId } from "react";

import { SourceLinks } from "@/modules/reference/components/source-links";

import { formatCounts, formatHeldOn, voteReference, voteSubjectHeadings } from "../vote-labels";
import { groupPositionLabels, voteResultLabels } from "../vote-kinds";
import type { PublishedGroupVote, PublishedVote } from "../votes";

// The outcome of the final reading on the whole text, shown before anything else about it.
export function FinalVoteResult({ votes }: { votes: PublishedVote[] }) {
  const final = votes.find((vote) => vote.subject === "whole_text");
  if (!final) return null;

  return (
    <p className="flex flex-wrap items-baseline gap-x-2 rounded-xl border p-4">
      <span className="font-semibold">
        Vote sur l’ensemble : texte {final.result === "adopted" ? "adopté" : "rejeté"}
      </span>
      <span className="text-sm text-muted-foreground">
        le {formatHeldOn(final.heldOn)} ({voteReference(final).toLowerCase()})
      </span>
    </p>
  );
}

// Every scrutin of the text, groups in the official order of the Assemblée so that none is put forward.
export function TextVotes({ votes }: { votes: PublishedVote[] }) {
  const headingId = useId();
  if (votes.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="font-heading text-xl font-semibold tracking-tight">
          Votes des groupes parlementaires
        </h2>
        <p className="text-sm text-muted-foreground">
          Position majoritaire de chaque groupe, dans l’ordre officiel de l’Assemblée, avec son décompte quand il
          est connu.
        </p>
      </div>
      {votes.map((vote) => (
        <VoteCard key={vote.id} vote={vote} />
      ))}
    </section>
  );
}

// The vote of each group in a scrutin, in the official order the scrutin comes in.
export function GroupVoteList({ groupVotes }: { groupVotes: PublishedGroupVote[] }) {
  if (groupVotes.length === 0) {
    return <p className="text-sm text-muted-foreground">Le vote des groupes n’est pas renseigné pour ce scrutin.</p>;
  }

  return (
    <ul className="flex flex-col divide-y">
      {groupVotes.map(({ group, position, counts }) => (
        <li key={group.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5">
          <span>
            {group.name} <span className="text-muted-foreground">({group.abbreviation})</span>
          </span>
          <span className="flex flex-col items-end">
            <span className="font-medium">{groupPositionLabels[position]}</span>
            {counts && <span className="text-xs text-muted-foreground tabular-nums">{formatCounts(counts)}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function OfficialVoteLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="w-fit rounded-sm text-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      Consulter la page officielle du scrutin
      <ExternalLink aria-hidden className="ml-1 inline size-3.5 align-baseline" />
      <span className="sr-only"> (nouvel onglet)</span>
    </a>
  );
}

function VoteCard({ vote }: { vote: PublishedVote }) {
  const headingId = useId();

  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-4 rounded-xl border p-5">
      <header className="flex flex-col gap-1">
        <h3 id={headingId} className="font-semibold">
          {voteSubjectHeadings[vote.subject]}
        </h3>
        <p className="text-sm text-muted-foreground">
          {voteReference(vote)} · {formatHeldOn(vote.heldOn)} ·{" "}
          <span className="font-medium text-foreground">{voteResultLabels[vote.result]}</span>
        </p>
        {vote.officialUrl && <OfficialVoteLink href={vote.officialUrl} />}
      </header>
      <GroupVoteList groupVotes={vote.groupVotes} />
      <SourceLinks sources={vote.sources} />
    </article>
  );
}

