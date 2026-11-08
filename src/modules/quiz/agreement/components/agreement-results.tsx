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
              Cette candidature n’a de position sur aucune de vos réponses : elle n’a pas de score.
            </p>
          ) : (
            <ScoreBar score={score.total} />
          )}
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Détail par thématique</summary>
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

function ScoreBar({ score }: { score: number }) {
  return (
    <div aria-hidden className="h-2 overflow-hidden rounded-full bg-muted">
      <div className="h-full rounded-full bg-foreground/70" style={{ width: `${score * 100}%` }} />
    </div>
  );
}
