import { describe, expect, it } from "vitest";

import type { PositionValue, Stance } from "../positions/vocabulary";
import { agreementScores, type ScoredQuestion } from "./score";

const health = { id: "health", name: "Santé" };
const work = { id: "work", name: "Travail" };

function question(id: string, topic: { id: string; name: string }, positions: Record<string, PositionValue>): ScoredQuestion {
  return {
    id,
    topic,
    positions: Object.entries(positions).map(([candidacyId, value]) => ({ candidacyId, value })),
  };
}

function answersOf(entries: Record<string, Stance>): Map<string, Stance> {
  return new Map(Object.entries(entries));
}

describe("the agreement score", () => {
  it("is 1 − |answer − position| / 4 on each question", () => {
    const quiz = [
      question("same", health, { a: 2 }),
      question("one-step", health, { b: 1 }),
      question("opposite", health, { c: -2 }),
      question("halfway", health, { d: 0 }),
    ];
    const answers = answersOf({ same: 2, "one-step": 2, opposite: 2, halfway: -2 });

    const totals = Object.fromEntries(
      agreementScores(quiz, answers, ["a", "b", "c", "d"]).map((score) => [score.candidacyId, score.total]),
    );

    expect(totals).toEqual({ a: 1, b: 0.75, c: 0, d: 0.5 });
  });

  it("averages the questions of each topic, and every question retained in total", () => {
    const quiz = [
      question("h1", health, { a: 2 }),
      question("w1", work, { a: -2 }),
      question("w2", work, { a: 0 }),
      question("w3", work, { a: -1 }),
    ];
    const answers = answersOf({ h1: 2, w1: 2, w2: 2, w3: 2 });

    const [score] = agreementScores(quiz, answers, ["a"]);

    expect(score.byTopic).toEqual([
      { topic: health, score: 1 },
      { topic: work, score: 0.25 },
    ]);
    // (1 + 0 + 0.5 + 0.25) / 4 over the questions, rather than (1 + 0.25) / 2 over the topics.
    expect(score.total).toBe(0.4375);
  });

  it("leaves out the questions where the candidacy has no position, or none entered", () => {
    const quiz = [
      question("q1", health, { a: 2, b: null }),
      question("q2", health, { a: -2, b: -2 }),
      question("q3", work, { a: 2 }),
    ];

    const scores = agreementScores(quiz, answersOf({ q1: -2, q2: -2, q3: -2 }), ["a", "b"]);
    const b = scores.find((score) => score.candidacyId === "b")!;

    // b has no position on q1 and none entered on q3: only q2 counts, a full agreement.
    expect(b.total).toBe(1);
    expect(b.byTopic).toEqual([
      { topic: health, score: 1 },
      { topic: work, score: null },
    ]);
  });

  it("leaves out the questions the visitor has not answered", () => {
    const quiz = [question("q1", health, { a: 2 }), question("q2", health, { a: -2 })];

    expect(agreementScores(quiz, answersOf({ q1: 2 }), ["a"])[0].total).toBe(1);
  });

  it("gives no score, rather than 0 %, to a candidacy without any question retained", () => {
    const quiz = [question("q1", health, { a: 2, silent: null })];

    const silent = agreementScores(quiz, answersOf({ q1: -2 }), ["a", "silent", "absent"]).filter(
      (score) => score.candidacyId !== "a",
    );

    expect(silent).toEqual([
      { candidacyId: "silent", total: null, byTopic: [{ topic: health, score: null }] },
      { candidacyId: "absent", total: null, byTopic: [{ topic: health, score: null }] },
    ]);
  });

  it("sorts the candidacies from the highest score to the lowest, those without a score last", () => {
    const quiz = [question("q1", health, { low: -2, none: null, high: 2, middle: 0 })];

    const order = agreementScores(quiz, answersOf({ q1: 2 }), ["low", "none", "high", "middle"]).map(
      (score) => score.candidacyId,
    );

    expect(order).toEqual(["high", "middle", "low", "none"]);
  });

  it("keeps the given order between equal scores", () => {
    const quiz = [question("q1", health, { first: 1, second: 1, third: 1 })];

    const order = agreementScores(quiz, answersOf({ q1: 2 }), ["second", "third", "first"]).map(
      (score) => score.candidacyId,
    );

    expect(order).toEqual(["second", "third", "first"]);
  });

  it("lists the topics in the order of the quiz", () => {
    const quiz = [question("w1", work, { a: 2 }), question("h1", health, { a: 2 }), question("w2", work, { a: 2 })];

    const [score] = agreementScores(quiz, answersOf({ w1: 2, h1: 2, w2: 2 }), ["a"]);

    expect(score.byTopic.map((topic) => topic.topic)).toEqual([work, health]);
  });
});
