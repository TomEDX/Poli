"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { shuffled } from "@/lib/shuffle";

import { AgreementResults, type ScoredCandidacy } from "../agreement/components/agreement-results";
import { agreementScores } from "../agreement/score";
import { type Stance, stanceLabels, stances } from "../positions/vocabulary";
import type { PublishedQuestion } from "../questions/queries";

export type QuizCandidacy = { id: string; label: string };

/**
 * The full quiz, one statement at a time, then the agreement scores. The answers stay in this
 * component's state: nothing is sent to the server, during or after the quiz (ADR 0002).
 */
export function FullQuiz({ questions, candidacies }: { questions: PublishedQuestion[]; candidacies: QuizCandidacy[] }) {
  const [answers, setAnswers] = useState<ReadonlyMap<string, Stance>>(() => new Map());
  const [current, setCurrent] = useState(0);
  const [results, setResults] = useState<ScoredCandidacy[] | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // Focus follows each step the visitor takes, but not the first render of the page.
  const stepTaken = useRef(false);

  useEffect(() => {
    if (stepTaken.current) headingRef.current?.focus();
  }, [current, results]);

  function goTo(index: number) {
    stepTaken.current = true;
    setCurrent(index);
  }

  function showResults(given: ReadonlyMap<string, Stance>) {
    stepTaken.current = true;
    // Shuffled first, so that equal scores do not follow the order of the parties' names.
    const order = shuffled(candidacies);
    const labels = new Map(order.map((candidacy) => [candidacy.id, candidacy.label]));
    const scores = agreementScores(questions, given, order.map((candidacy) => candidacy.id));
    setResults(scores.map((score) => ({ ...score, label: labels.get(score.candidacyId)! })));
  }

  function answer(stance: Stance) {
    const given = new Map(answers).set(questions[current].id, stance);
    setAnswers(given);
    if (current < questions.length - 1) goTo(current + 1);
    else showResults(given);
  }

  function restart() {
    stepTaken.current = true;
    setAnswers(new Map());
    setCurrent(0);
    setResults(null);
  }

  // Back to the last question, with every answer kept.
  function editAnswers() {
    stepTaken.current = true;
    setResults(null);
  }

  if (results) {
    return (
      <section aria-labelledby="quiz-results" className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h2 id="quiz-results" ref={headingRef} tabIndex={-1} className="font-heading text-2xl font-semibold outline-none">
            Vos résultats
          </h2>
          <p className="text-muted-foreground">
            Votre score d’accord avec chaque candidature, du plus élevé au plus bas. Une question sur laquelle une
            candidature n’a pas de position ne compte pas dans son score. Notre{" "}
            <Link href="/methode" className="underline underline-offset-4 hover:text-foreground">
              méthode
            </Link>{" "}
            détaille le calcul.
          </p>
        </div>
        {results.length > 0 ? (
          <AgreementResults scores={results} />
        ) : (
          <p className="text-muted-foreground">Aucune candidature n’est encore publiée.</p>
        )}
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={editAnswers}>
            Modifier mes réponses
          </Button>
          <Button variant="ghost" onClick={restart}>
            Recommencer le quiz
          </Button>
        </div>
      </section>
    );
  }

  const question = questions[current];
  const given = answers.get(question.id);
  const last = current === questions.length - 1;

  return (
    <section aria-labelledby="quiz-statement" className="flex flex-col gap-6">
      <Progress current={current} total={questions.length} />
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          {question.subtopic.topic.name} · {question.subtopic.name}
        </p>
        <h2
          id="quiz-statement"
          ref={headingRef}
          tabIndex={-1}
          className="font-heading text-2xl font-semibold text-pretty outline-none"
        >
          {question.statement}
        </h2>
      </div>
      <div role="group" aria-labelledby="quiz-statement" className="flex flex-col gap-2">
        {stances.map((stance) => (
          <Button
            key={stance}
            size="lg"
            variant={given === stance ? "default" : "outline"}
            aria-pressed={given === stance}
            onClick={() => answer(stance)}
            className="h-11 justify-start px-4 text-base"
          >
            {stanceLabels[stance]}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap justify-between gap-2">
        <Button variant="ghost" disabled={current === 0} onClick={() => goTo(current - 1)}>
          Question précédente
        </Button>
        {given !== undefined && (
          <Button variant="outline" onClick={() => (last ? showResults(answers) : goTo(current + 1))}>
            {last ? "Voir mes résultats" : "Question suivante"}
          </Button>
        )}
      </div>
    </section>
  );
}

function Progress({ current, total }: { current: number; total: number }) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-2">
      <p id={labelId} className="text-sm text-muted-foreground">
        Question {current + 1} sur {total}
      </p>
      <div
        role="progressbar"
        aria-labelledby={labelId}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current + 1}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div className="h-full rounded-full bg-foreground/70 transition-[width]" style={{ width: `${((current + 1) / total) * 100}%` }} />
      </div>
    </div>
  );
}
