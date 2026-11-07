import { useId } from "react";

import { amendmentFateLabels, amendmentOpinionLabels, type AmendmentOpinion, wasVotedOn } from "../amendment-kinds";
import { amendmentReference } from "../amendment-labels";
import type { PublishedAmendment } from "../amendments";
import { formatHeldOn, voteReference } from "../vote-labels";
import { voteResultLabels } from "../vote-kinds";
import { GroupVoteList, OfficialVoteLink } from "./text-votes";

// The amendments the editors picked for a text, by number, each with how it was voted.
export function TextAmendments({ amendments }: { amendments: PublishedAmendment[] }) {
  const headingId = useId();
  if (amendments.length === 0) return null;

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h2 id={headingId} className="font-heading text-xl font-semibold tracking-tight">
          Amendements marquants
        </h2>
        <p className="text-sm text-muted-foreground">
          Dans l’ordre de leur numéro, avec le vote de chaque groupe quand un scrutin public a eu lieu.
        </p>
      </div>
      {amendments.map((amendment) => (
        <AmendmentCard key={amendment.id} amendment={amendment} />
      ))}
    </section>
  );
}

function AmendmentCard({ amendment }: { amendment: PublishedAmendment }) {
  const headingId = useId();
  const { authorGroup, vote } = amendment;
  const opinions = [
    { label: "Avis du gouvernement", opinion: amendment.governmentOpinion },
    { label: "Avis de la commission", opinion: amendment.committeeOpinion },
  ].filter((entry): entry is { label: string; opinion: Exclude<AmendmentOpinion, "none"> } => entry.opinion !== "none");

  return (
    <article aria-labelledby={headingId} className="flex flex-col gap-4 rounded-xl border p-5">
      <header className="flex flex-col gap-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 id={headingId} className="font-semibold">
            {amendmentReference(amendment)}
          </h3>
          <p className="text-sm font-medium">{amendmentFateLabels[amendment.fate]}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          Déposé par {amendment.authorLabel}
          {authorGroup && (
            <>
              {" "}
              ({authorGroup.name}, {authorGroup.abbreviation})
            </>
          )}
        </p>
        {amendment.cosignatories && (
          <p className="text-sm text-muted-foreground">Cosignataires : {amendment.cosignatories}</p>
        )}
      </header>

      {opinions.length > 0 && (
        <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {opinions.map(({ label, opinion }) => (
            <div key={label} className="flex gap-1.5">
              <dt className="text-muted-foreground">{label} :</dt>
              <dd className="font-medium">{amendmentOpinionLabels[opinion]}</dd>
            </div>
          ))}
        </dl>
      )}

      <div className="flex flex-col gap-1 rounded-lg bg-muted/40 p-4">
        <p className="text-xs font-semibold">Résumé éditorial</p>
        <p className="text-sm whitespace-pre-line text-pretty">{amendment.summary}</p>
      </div>

      {vote ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            {voteReference(vote)} · {formatHeldOn(vote.heldOn)} ·{" "}
            <span className="font-medium text-foreground">{voteResultLabels[vote.result]}</span>
          </p>
          {vote.officialUrl && <OfficialVoteLink href={vote.officialUrl} />}
          <GroupVoteList groupVotes={vote.groupVotes} />
        </div>
      ) : (
        wasVotedOn(amendment.fate) && (
          <p className="text-sm text-muted-foreground">
            Voté à main levée : aucun scrutin public, le vote de chaque groupe n’est donc pas connu.
          </p>
        )
      )}
    </article>
  );
}

