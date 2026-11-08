import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getMissingPositions } from "@/modules/quiz/positions/queries";
import { QuestionEditor } from "@/modules/quiz/questions/components/question-editor";
import { getQuestions } from "@/modules/quiz/questions/queries";
import { getParties } from "@/modules/reference/parties/queries";
import { getSources } from "@/modules/reference/sources/queries";
import { getTopicTree } from "@/modules/reference/topics/queries";

export const metadata: Metadata = { title: "Quiz · Administration · Poli." };

export default function AdminQuizPage() {
  return (
    <Suspense fallback={<QuizSkeleton />}>
      <Questions />
    </Suspense>
  );
}

async function Questions() {
  const [questions, missingPositions, parties, topicTree, sources] = await Promise.all([
    getQuestions(),
    getMissingPositions(),
    getParties(),
    getTopicTree(),
    getSources(),
  ]);
  const candidacies = parties.flatMap((party) => (party.candidacy ? [party.candidacy] : []));
  return (
    <QuestionEditor
      questions={questions}
      missingPositions={missingPositions}
      candidacies={candidacies}
      topicTree={topicTree}
      sources={sources}
    />
  );
}

function QuizSkeleton() {
  return (
    <div aria-busy className="flex max-w-5xl flex-col gap-8">
      <span className="sr-only">Chargement des questions…</span>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
