import type { PositionValue, Stance } from "../positions/vocabulary";

type Topic = { id: string; name: string };

// What the score needs of a published question; the visitor's answers are keyed by question id.
export type ScoredQuestion = {
  id: string;
  subtopic: { topic: Topic };
  positions: { candidacyId: string; value: PositionValue }[];
};

// From 0 to 1; null when no question is retained for the candidacy, which is no score rather than 0 %.
export type CandidacyScore = {
  candidacyId: string;
  total: number | null;
  byTopic: { topic: Topic; score: number | null }[];
};

// The scale runs from +2 to -2, so two answers are at most 4 apart.
const SCALE_SPAN = 4;

/**
 * The agreement score of each candidacy, computed on the device (ADR 0002). On each question,
 * agreement = 1 − |answer − position| / 4. A question the visitor has not answered, or where the
 * candidacy has no position, is left out of that candidacy's score. The score of a topic is the
 * mean over its questions, the total the mean over every question retained. Sorted from the
 * highest total to the lowest, those without a score last; equal scores keep the given order.
 */
export function agreementScores(
  questions: ScoredQuestion[],
  answers: ReadonlyMap<string, Stance>,
  candidacyIds: string[],
): CandidacyScore[] {
  const topics = [...new Map(questions.map(({ subtopic: { topic } }) => [topic.id, topic])).values()];
  const scores = candidacyIds.map((candidacyId) => {
    const agreements = questions.flatMap((question) => {
      const answer = answers.get(question.id);
      const position = question.positions.find((candidate) => candidate.candidacyId === candidacyId)?.value ?? null;
      if (answer === undefined || position === null) return [];
      return [{ topicId: question.subtopic.topic.id, agreement: 1 - Math.abs(answer - position) / SCALE_SPAN }];
    });
    return {
      candidacyId,
      total: meanOf(agreements.map((retained) => retained.agreement)),
      byTopic: topics.map((topic) => ({
        topic,
        score: meanOf(agreements.filter((retained) => retained.topicId === topic.id).map((retained) => retained.agreement)),
      })),
    };
  });
  return scores.toSorted((a, b) => (b.total ?? -1) - (a.total ?? -1));
}

function meanOf(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}
