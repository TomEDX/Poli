"use client";

import { useId, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "@/components/ui/field";
import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { Source } from "@/modules/reference/sources/queries";
import type { TopicTree } from "@/modules/reference/topics/queries";

import type { PositionInput } from "../../positions/queries";
import { noPositionLabel, stanceLabels, stances } from "../../positions/vocabulary";
import { createQuestionAction, removeQuestionAction, saveQuestionAction } from "../actions";
import type { EditableQuestion, QuestionChanges } from "../queries";
import { newQuestionSchema, STATEMENT_MAX_LENGTH } from "../validation";
import type { QuizCandidacy } from "./question-editor";

type QuestionSheetProps = {
  // null to create a new question.
  question: EditableQuestion | null;
  candidacies: QuizCandidacy[];
  topicTree: TopicTree;
  sources: Source[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where the focus goes once the sheet closes: the row or button that opened it.
  returnFocus: () => HTMLElement | null;
};

type TypedField = "subtopicId" | "statement";

type Errors = Partial<Record<TypedField | "form", string>>;

// As the selects hold it: "" while not entered yet, "none" for no position, else the stance.
type PositionChoice = { value: string; sourceId: string };

const fieldOrder: TypedField[] = ["subtopicId", "statement"];

const NOT_ENTERED = "";

const NO_POSITION = "none";

export function QuestionSheet({ open, onOpenChange, returnFocus, ...form }: QuestionSheetProps) {
  const { question } = form;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full sm:max-w-xl" finalFocus={() => returnFocus() ?? true}>
        <SheetHeader className="border-b p-6">
          <SheetTitle>{question ? "Modifier la question" : "Nouvelle question"}</SheetTitle>
          <SheetDescription>Quiz complet</SheetDescription>
        </SheetHeader>
        {/* Keyed by question so the fields start again from the question shown. */}
        <QuestionForm key={question?.id ?? "new"} {...form} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

type QuestionFormProps = Omit<QuestionSheetProps, "open" | "onOpenChange" | "returnFocus"> & { onDone: () => void };

function QuestionForm({ question, candidacies, topicTree, sources, onDone }: QuestionFormProps) {
  const [values, setValues] = useState<Record<TypedField, string>>(() => ({
    subtopicId: question?.subtopicId ?? "",
    statement: question?.statement ?? "",
  }));
  const [choices, setChoices] = useState<Record<string, PositionChoice>>(() => choicesFrom(question?.positions ?? []));
  const [published, setPublished] = useState(question?.status === "published");
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const formId = useId();
  const ids: Record<TypedField | "published", string> = {
    subtopicId: useId(),
    statement: useId(),
    published: useId(),
  };

  const show = (next: Errors) => {
    setErrors(next);
    const first = fieldOrder.find((field) => next[field]);
    if (first) document.getElementById(ids[first])?.focus();
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = newQuestionSchema.safeParse({
      ...values,
      positions: positionsFrom(choices),
      status: published ? "published" : "draft",
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (field === "subtopicId" || field === "statement") next[field] ??= issue.message;
        else next.form ??= issue.message;
      }
      return show(next);
    }
    const input = parsed.data;

    startTransition(async () => {
      const changes = question ? changesFrom(question, input) : null;
      if (changes && Object.keys(changes).length === 0) return onDone();
      const result =
        changes && question ? await saveQuestionAction(question.id, changes) : await createQuestionAction(input);
      if (!result.ok) return show({ form: result.message });
      toast.add({ title: question ? "Modifications enregistrées" : "Question ajoutée", type: "success" });
      onDone();
    });
  };

  const fieldProps = (field: TypedField) => ({
    id: ids[field],
    value: values[field],
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${ids[field]}-error` : undefined,
    onChange: (event: React.ChangeEvent<HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((current) => ({ ...current, [field]: event.target.value })),
  });

  const error = (field: TypedField) => <FieldError id={`${ids[field]}-error`}>{errors[field]}</FieldError>;

  return (
    <>
      <form id={formId} noValidate onSubmit={submit} className="flex flex-1 flex-col gap-8 overflow-y-auto p-6">
        <FieldGroup>
          <Field data-invalid={errors.subtopicId ? true : undefined}>
            <FieldLabel htmlFor={ids.subtopicId}>Sous-thématique</FieldLabel>
            <NativeSelect {...fieldProps("subtopicId")} className="w-full">
              <NativeSelectOption value="" disabled>
                Choisir…
              </NativeSelectOption>
              {topicTree
                .filter((topic) => topic.subtopics.length > 0)
                .map((topic) => (
                  <NativeSelectOptGroup key={topic.id} label={topic.name}>
                    {topic.subtopics.map((subtopic) => (
                      <NativeSelectOption key={subtopic.id} value={subtopic.id}>
                        {subtopic.name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelectOptGroup>
                ))}
            </NativeSelect>
            {error("subtopicId")}
          </Field>
          <Field data-invalid={errors.statement ? true : undefined}>
            <FieldLabel htmlFor={ids.statement}>Affirmation</FieldLabel>
            <Textarea
              {...fieldProps("statement")}
              rows={3}
              maxLength={STATEMENT_MAX_LENGTH}
              aria-describedby={`${ids.statement}-help${errors.statement ? ` ${ids.statement}-error` : ""}`}
            />
            <FieldDescription id={`${ids.statement}-help`}>
              Une phrase neutre, à laquelle on répond de « tout à fait d’accord » à « pas du tout d’accord ».
            </FieldDescription>
            {error("statement")}
          </Field>
        </FieldGroup>

        <PositionFields
          candidacies={candidacies}
          sources={sources}
          choices={choices}
          onChange={(candidacyId, choice) => setChoices((current) => ({ ...current, [candidacyId]: choice }))}
        />

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={ids.published}>En ligne</FieldLabel>
            <FieldDescription>
              {published ? "Posée dans le quiz dès l’enregistrement." : "Brouillon : absente du quiz."}
            </FieldDescription>
          </FieldContent>
          <Switch id={ids.published} checked={published} onCheckedChange={setPublished} />
        </Field>

        {errors.form && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}

        {question && <Deletion question={question} onRemoved={onDone} />}
      </form>

      <SheetFooter className="flex-row justify-end border-t p-6">
        <SheetClose render={<Button variant="outline" />}>Annuler</SheetClose>
        <Button type="submit" form={formId} disabled={pending} focusableWhenDisabled>
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? "Enregistrement…" : question ? "Enregistrer" : "Ajouter la question"}
        </Button>
      </SheetFooter>
    </>
  );
}

type PositionFieldsProps = {
  candidacies: QuizCandidacy[];
  sources: Source[];
  choices: Record<string, PositionChoice>;
  onChange: (candidacyId: string, choice: PositionChoice) => void;
};

// One row per candidacy, drafts included, so that none is forgotten.
function PositionFields({ candidacies, sources, choices, onChange }: PositionFieldsProps) {
  return (
    <FieldSet>
      <FieldLegend>Positions des candidatures</FieldLegend>
      <FieldDescription>
        « Pas de position » quand le programme ne dit rien sur la question : elle sort alors de son score. Une position
        laissée à saisir est signalée dans la liste.
      </FieldDescription>
      {candidacies.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune candidature : créez-en dans Partis et candidatures.</p>
      ) : (
        <FieldGroup className="@container gap-5">
          {candidacies.map((candidacy) => (
            <PositionField
              key={candidacy.id}
              candidacy={candidacy}
              sources={sources}
              choice={choices[candidacy.id] ?? { value: NOT_ENTERED, sourceId: "" }}
              onChange={(choice) => onChange(candidacy.id, choice)}
            />
          ))}
        </FieldGroup>
      )}
    </FieldSet>
  );
}

type PositionFieldProps = {
  candidacy: QuizCandidacy;
  sources: Source[];
  choice: PositionChoice;
  onChange: (choice: PositionChoice) => void;
};

function PositionField({ candidacy, sources, choice, onChange }: PositionFieldProps) {
  const positionId = useId();
  const labelId = useId();
  const sourceId = useId();
  const entered = choice.value !== NOT_ENTERED;

  return (
    <div role="group" aria-labelledby={labelId} className="flex flex-col gap-2">
      <FieldLabel id={labelId} htmlFor={positionId}>
        {candidacy.label}
        {candidacy.status === "draft" && <span className="font-normal text-muted-foreground">(brouillon)</span>}
      </FieldLabel>
      {/* Side by side once the sheet, not the window, is wide enough for the longest stance. */}
      <div className="grid gap-2 @md:grid-cols-2">
        <NativeSelect
          id={positionId}
          value={choice.value}
          aria-label={`Position de ${candidacy.label}`}
          className="w-full"
          onChange={(event) => onChange({ ...choice, value: event.target.value })}
        >
          <NativeSelectOption value={NOT_ENTERED}>À saisir</NativeSelectOption>
          {stances.map((stance) => (
            <NativeSelectOption key={stance} value={String(stance)}>
              {stanceLabels[stance]}
            </NativeSelectOption>
          ))}
          <NativeSelectOption value={NO_POSITION}>{noPositionLabel}</NativeSelectOption>
        </NativeSelect>
        <label htmlFor={sourceId} className="sr-only">
          Source de la position de {candidacy.label}
        </label>
        <NativeSelect
          id={sourceId}
          value={choice.sourceId}
          disabled={!entered}
          className="w-full"
          onChange={(event) => onChange({ ...choice, sourceId: event.target.value })}
        >
          <NativeSelectOption value="">Sans source</NativeSelectOption>
          {sources.map((source) => (
            <NativeSelectOption key={source.id} value={source.id}>
              {source.title} · {source.organization}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </div>
    </div>
  );
}

// Kept at the bottom of the sheet, away from the list: deleting is rare and cannot be undone.
function Deletion({ question, onRemoved }: { question: EditableQuestion; onRemoved: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setConfirming(false);
    startTransition(async () => {
      const result = await removeQuestionAction(question.id);
      if (!result.ok) return void toast.add({ title: result.message, type: "error" });
      toast.add({ title: "Question supprimée", type: "success" });
      onRemoved();
    });
  };

  return (
    <>
      <FieldSeparator />
      <FieldSet>
        <FieldLegend>Suppression</FieldLegend>
        <FieldDescription>La question disparaît du quiz avec ses positions. La suppression est définitive.</FieldDescription>
        <div>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => setConfirming(true)}>
            Supprimer la question
          </Button>
        </div>
      </FieldSet>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la question ?</AlertDialogTitle>
            <AlertDialogDescription>
              Elle disparaît du quiz avec les positions des candidatures. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Supprimer la question
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function choicesFrom(positions: PositionInput[]): Record<string, PositionChoice> {
  return Object.fromEntries(
    positions.map(({ candidacyId, value, sourceId }) => [
      candidacyId,
      { value: value === null ? NO_POSITION : String(value), sourceId: sourceId ?? "" },
    ]),
  );
}

// A candidacy left to enter sends nothing, and loses the source it may have had.
function positionsFrom(choices: Record<string, PositionChoice>) {
  return Object.entries(choices)
    .filter(([, choice]) => choice.value !== NOT_ENTERED)
    .map(([candidacyId, choice]) => ({
      candidacyId,
      value: choice.value === NO_POSITION ? null : Number(choice.value),
      sourceId: choice.sourceId || null,
    }));
}

// Only what changed is sent, so a save never brings back a value another editor changed.
function changesFrom(question: EditableQuestion, input: ReturnType<typeof newQuestionSchema.parse>): QuestionChanges {
  const changes: QuestionChanges = {};
  for (const field of ["subtopicId", "statement", "status"] as const) {
    if (input[field] !== question[field]) Object.assign(changes, { [field]: input[field] });
  }
  if (!samePositions(input.positions, question.positions)) changes.positions = input.positions;
  return changes;
}

function samePositions(given: PositionInput[], saved: PositionInput[]): boolean {
  const key = ({ candidacyId, value, sourceId }: PositionInput) => `${candidacyId}:${value}:${sourceId}`;
  const savedKeys = new Set(saved.map(key));
  return given.length === saved.length && given.every((position) => savedKeys.has(key(position)));
}
