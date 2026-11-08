import type { Metadata } from "next";

import { FullQuiz } from "@/modules/quiz/components/full-quiz";
import { getPublishedQuiz } from "@/modules/quiz/questions/queries";
import { getPublishedCandidacies } from "@/modules/reference/parties/queries";

export const metadata: Metadata = {
  title: "Quiz · Poli.",
  description:
    "Réagissez à des affirmations neutres et découvrez votre score d’accord avec chaque candidature. Vos réponses restent sur votre appareil.",
};

export default function QuizPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-4 py-12 md:px-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Quiz</h1>
        <p className="text-muted-foreground">
          Dites à quel point vous êtes d’accord avec chaque affirmation, puis découvrez de quelles candidatures vous êtes
          le plus proche. Vos réponses restent sur votre appareil : elles ne sont envoyées à aucun serveur.
        </p>
      </div>
      <PublishedQuiz />
    </main>
  );
}

// Cached, so the page is built ahead of time; each editor write regenerates it (ADR 0005).
async function PublishedQuiz() {
  "use cache";
  const [questions, candidacies] = await Promise.all([getPublishedQuiz(), getPublishedCandidacies()]);
  if (questions.length === 0) {
    return <p className="text-muted-foreground">Le quiz n’a pas encore de questions publiées.</p>;
  }
  return <FullQuiz questions={questions} candidacies={candidacies.map(({ id, label }) => ({ id, label }))} />;
}
