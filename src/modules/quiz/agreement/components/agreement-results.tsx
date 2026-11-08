import { ChevronRight } from "lucide-react";

import { Progress } from "@/components/ui/progress";

import { formatScore } from "../vocabulary";
import type { CandidacyScore } from "../score";

export type ScoredCandidacy = CandidacyScore & { label: string };

// The scores, already sorted, each with its detail by topic. Every candidacy has the same
// neutral colour and no logo.
export function AgreementResults({ scores }: { scores: ScoredCandidacy[] }) {
  return (
    <ol className="flex flex-col divide-y overflow-hidden rounded-xl border">
      {scores.map((score) => (
        <li key={score.candidacyId} className="flex flex-col gap-3 px-4 py-4">
          <div className="flex items-baseline justify-between gap-4">
            <span className="font-medium text-pretty">{score.label}</span>
            <span className="shrink-0 text-lg font-semibold tabular-nums">{formatScore(score.total)}</span>
          </div>
          {score.total === null ? (
            <p className="text-sm text-muted-foreground">
              Cette candidature n’a de position sur aucune des questions auxquelles vous avez répondu : elle n’a pas
              de score.
            </p>
          ) : (
            // The score is already written out above, so the bar is only a picture of it.
            <Progress aria-hidden value={score.total * 100} />
          )}
          <details className="group text-sm">
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-muted-foreground hover:text-foreground [&::-webkit-details-marker]:hidden">
              <ChevronRight
                aria-hidden
                className="size-4 transition-transform group-open:rotate-90 motion-reduce:transition-none"
              />
              Détail par thématique
            </summary>
            <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1">
              {score.byTopic.map(({ topic, score: topicScore }) => (
                <div key={topic.id} className="contents">
                  <dt>{topic.name}</dt>
                  <dd className="text-right tabular-nums">{formatScore(topicScore)}</dd>
                </div>
              ))}
            </dl>
          </details>
        </li>
      ))}
    </ol>
  );
}
