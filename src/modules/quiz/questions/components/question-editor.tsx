"use client";

import { ArrowDown, ArrowUp, CircleAlert, CircleQuestionMark, Plus } from "lucide-react";
import { useId, useOptimistic, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/components/ui/toast";
import type { Direction } from "@/lib/direction";
import type { Party } from "@/modules/reference/parties/queries";
import type { Source } from "@/modules/reference/sources/queries";
import type { TopicTree } from "@/modules/reference/topics/queries";

import type { MissingPositions } from "../../positions/queries";
import { moveQuestionAction, saveQuestionAction } from "../actions";
import type { EditableQuestion } from "../queries";
import { QuestionSheet } from "./question-sheet";

// As the administration lists it, drafts included.
export type QuizCandidacy = NonNullable<Party["candidacy"]>;

type QuestionEditorProps = {
  questions: EditableQuestion[];
  missingPositions: MissingPositions;
  candidacies: QuizCandidacy[];
  topicTree: TopicTree;
  sources: Source[];
};

// The questions of one subtopic, which the quiz asks in a row and the editors order.
type SubtopicGroup = { id: string; name: string; topicName: string; questions: EditableQuestion[] };

export function QuestionEditor({ questions, missingPositions, candidacies, topicTree, sources }: QuestionEditorProps) {
  // The sheet keeps the question it shows while it closes; null means a new question.
  const [sheet, setSheet] = useState<{ open: boolean; questionId: string | null }>({ open: false, questionId: null });
  const newQuestionButton = useRef<HTMLButtonElement>(null);
  const openButtons = useRef(new Map<string, HTMLButtonElement>());
  const questionsHeadingId = useId();

  const shown = questions.find((question) => question.id === sheet.questionId) ?? null;
  const open = (questionId: string | null) => setSheet({ open: true, questionId });
  const groups = groupBySubtopic(questions, topicTree);
  const labels = new Map(candidacies.map((candidacy) => [candidacy.id, candidacy.label]));
  const missingLabels = new Map(
    missingPositions.map(({ questionId, candidacyIds }) => [questionId, candidacyIds.map((id) => labels.get(id) ?? "")]),
  );

  return (
    <div className="flex max-w-5xl flex-col gap-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">Questions du quiz</h1>
          <p className="text-sm text-muted-foreground">
            Des affirmations neutres, rangées par sous-thématique, avec la position de chaque candidature.
          </p>
        </div>
        {questions.length > 0 && (
          <Button ref={newQuestionButton} onClick={() => open(null)}>
            <Plus data-icon="inline-start" />
            Nouvelle question
          </Button>
        )}
      </div>

      <section aria-labelledby={questionsHeadingId} className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h2 id={questionsHeadingId} className="sr-only">
            Questions
          </h2>
          {questions.length > 0 && <MissingSummary count={missingPositions.length} candidacyCount={candidacies.length} />}
        </div>
        {questions.length === 0 ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <CircleQuestionMark />
              </EmptyMedia>
              <EmptyTitle>Aucune question</EmptyTitle>
              <EmptyDescription>
                Rédigez une affirmation, rangez-la dans sa sous-thématique et saisissez la position de chaque candidature.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button ref={newQuestionButton} onClick={() => open(null)}>
                <Plus data-icon="inline-start" />
                Nouvelle question
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          groups.map((group) => (
            <SubtopicQuestions
              key={group.id}
              group={group}
              missingLabels={missingLabels}
              onOpen={open}
              openRef={(questionId, button) => {
                if (button) openButtons.current.set(questionId, button);
                else openButtons.current.delete(questionId);
              }}
            />
          ))
        )}
      </section>

      <QuestionSheet
        question={shown}
        candidacies={candidacies}
        topicTree={topicTree}
        sources={sources}
        open={sheet.open}
        onOpenChange={(isOpen) => setSheet((current) => ({ ...current, open: isOpen }))}
        returnFocus={() => (shown ? openButtons.current.get(shown.id) : newQuestionButton.current) ?? null}
      />
    </div>
  );
}

function MissingSummary({ count, candidacyCount }: { count: number; candidacyCount: number }) {
  if (candidacyCount === 0) {
    return <p className="text-sm text-muted-foreground">Aucune candidature : créez-en dans Partis et candidatures.</p>;
  }
  if (count === 0) {
    return <p className="text-sm text-muted-foreground">Chaque candidature a une position sur chaque question.</p>;
  }
  return (
    <p className="flex items-center gap-1.5 text-sm font-medium text-amber-700 dark:text-amber-400">
      <CircleAlert aria-hidden className="size-4 shrink-0" />
      {count === 1
        ? "1 question attend encore la position d’une candidature."
        : `${count} questions attendent encore la position d’une candidature.`}
    </p>
  );
}

type SubtopicQuestionsProps = {
  group: SubtopicGroup;
  missingLabels: Map<string, string[]>;
  onOpen: (questionId: string) => void;
  openRef: (questionId: string, button: HTMLButtonElement | null) => void;
};

function SubtopicQuestions({ group, missingLabels, onOpen, openRef }: SubtopicQuestionsProps) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-3">
      <h3 id={headingId} className="flex flex-wrap items-baseline gap-x-2 font-semibold">
        {group.name}
        <span className="text-sm font-normal text-muted-foreground">{group.topicName}</span>
      </h3>
      <ol className="flex flex-col divide-y overflow-hidden rounded-xl border">
        {group.questions.map((question, index) => (
          <QuestionRow
            key={question.id}
            question={question}
            missing={missingLabels.get(question.id) ?? []}
            name={`la question ${index + 1} (${group.name})`}
            isFirst={index === 0}
            isLast={index === group.questions.length - 1}
            openRef={(button) => openRef(question.id, button)}
            onOpen={() => onOpen(question.id)}
          />
        ))}
      </ol>
    </section>
  );
}

type QuestionRowProps = {
  question: EditableQuestion;
  // The candidacies that have no position on it yet.
  missing: string[];
  // What screen readers call it: its place within its subtopic, which every control repeats.
  name: string;
  isFirst: boolean;
  isLast: boolean;
  openRef: React.Ref<HTMLButtonElement>;
  onOpen: () => void;
};

function QuestionRow({ question, missing, name, isFirst, isLast, openRef, onOpen }: QuestionRowProps) {
  const [moving, startMove] = useTransition();

  const move = (direction: Direction) =>
    startMove(async () => {
      const result = await moveQuestionAction(question.id, direction);
      if (!result.ok) toast.add({ title: result.message, type: "error" });
    });

  return (
    <li className="flex items-start gap-3 px-4 py-3.5 text-sm">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <button
          ref={openRef}
          type="button"
          onClick={onOpen}
          className="rounded-sm text-left font-medium text-pretty outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <span className="sr-only">Modifier {name} : </span>
          {question.statement}
        </button>
        {missing.length === 0 ? (
          <p className="text-muted-foreground">Positions complètes</p>
        ) : (
          <p className="flex items-start gap-1.5 text-amber-700 dark:text-amber-400">
            <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
            <span>
              {missing.length === 1 ? "Position manquante" : "Positions manquantes"} : {missing.join(", ")}
            </span>
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Monter ${name}`}
          title="Monter"
          disabled={moving || isFirst}
          onClick={() => move("up")}
        >
          <ArrowUp />
        </Button>
        <Button
          variant="ghost"
          size="icon-xs"
          aria-label={`Descendre ${name}`}
          title="Descendre"
          disabled={moving || isLast}
          onClick={() => move("down")}
        >
          <ArrowDown />
        </Button>
        <PublishedSwitch question={question} name={name} />
      </div>
    </li>
  );
}

// Publishing is the frequent task, so it stays one click away from the list.
function PublishedSwitch({ question, name }: { question: EditableQuestion; name: string }) {
  const [pending, startTransition] = useTransition();
  const [published, setPublished] = useOptimistic(question.status === "published");

  return (
    <Switch
      checked={published}
      aria-label={`${name.charAt(0).toUpperCase()}${name.slice(1)} en ligne`}
      aria-busy={pending}
      className="ml-2"
      onCheckedChange={(checked) =>
        startTransition(async () => {
          setPublished(checked);
          const result = await saveQuestionAction(question.id, { status: checked ? "published" : "draft" });
          if (!result.ok) toast.add({ title: result.message, type: "error" });
          else toast.add({ title: checked ? "Question mise en ligne" : "Question retirée du site", type: "success" });
        })
      }
    />
  );
}

// The questions come in the order of the quiz, so each subtopic's questions are consecutive.
function groupBySubtopic(questions: EditableQuestion[], topicTree: TopicTree): SubtopicGroup[] {
  const names = new Map(
    topicTree.flatMap((topic) => topic.subtopics.map((subtopic) => [subtopic.id, { name: subtopic.name, topicName: topic.name }])),
  );
  const groups: SubtopicGroup[] = [];
  for (const question of questions) {
    const last = groups.at(-1);
    if (last?.id === question.subtopicId) last.questions.push(question);
    else
      groups.push({
        id: question.subtopicId,
        ...(names.get(question.subtopicId) ?? { name: "", topicName: "" }),
        questions: [question],
      });
  }
  return groups;
}
