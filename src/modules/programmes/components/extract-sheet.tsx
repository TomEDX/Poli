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
import { Input } from "@/components/ui/input";
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
import { SourcePicker } from "@/modules/reference/sources/components/source-picker";
import { todayInParis } from "@/modules/reference/sources/vocabulary";
import type { Source } from "@/modules/reference/sources/queries";
import type { TopicTree } from "@/modules/reference/topics/queries";

import { createExtractAction, removeExtractAction, saveExtractAction } from "../actions";
import type { EditableExtract, ExtractChanges } from "../queries";
import { newExtractSchema, QUOTE_MAX_LENGTH } from "../validation";

type ExtractSheetProps = {
  candidacy: { id: string; label: string };
  // null to create a new extract, filed under newSubtopicId when given.
  extract: EditableExtract | null;
  newSubtopicId: string | null;
  topicTree: TopicTree;
  sources: Source[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where the focus goes once the sheet closes: the row or button that opened it.
  returnFocus: () => HTMLElement | null;
};

type TypedField = "subtopicId" | "quote" | "recordedOn";

type Errors = Partial<Record<TypedField | "form", string>>;

const fieldOrder: TypedField[] = ["subtopicId", "quote", "recordedOn"];

export function ExtractSheet({ open, onOpenChange, returnFocus, ...form }: ExtractSheetProps) {
  const { extract, newSubtopicId, candidacy } = form;
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full sm:max-w-lg" finalFocus={() => returnFocus() ?? true}>
        <SheetHeader className="border-b p-6">
          <SheetTitle>{extract ? "Modifier l’extrait" : "Nouvel extrait"}</SheetTitle>
          <SheetDescription>Programme de {candidacy.label}</SheetDescription>
        </SheetHeader>
        {/* Keyed by extract so the fields start again from the extract shown. */}
        <ExtractForm key={extract?.id ?? `new-${newSubtopicId}`} {...form} onDone={() => onOpenChange(false)} />
      </SheetContent>
    </Sheet>
  );
}

type ExtractFormProps = Omit<ExtractSheetProps, "open" | "onOpenChange" | "returnFocus"> & { onDone: () => void };

function ExtractForm({ candidacy, extract, newSubtopicId, topicTree, sources, onDone }: ExtractFormProps) {
  const [values, setValues] = useState<Record<TypedField, string>>(() => ({
    subtopicId: extract?.subtopicId ?? newSubtopicId ?? "",
    quote: extract?.quote ?? "",
    recordedOn: extract?.recordedOn ?? todayInParis(),
  }));
  const [sourceIds, setSourceIds] = useState<ReadonlySet<string>>(() => new Set(extract?.sourceIds ?? []));
  const [published, setPublished] = useState(extract?.status === "published");
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const formId = useId();
  const ids: Record<TypedField | "published", string> = {
    subtopicId: useId(),
    quote: useId(),
    recordedOn: useId(),
    published: useId(),
  };
  const today = todayInParis();

  const show = (next: Errors) => {
    setErrors(next);
    const first = fieldOrder.find((field) => next[field]);
    if (first) document.getElementById(ids[first])?.focus();
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = newExtractSchema.safeParse({
      ...values,
      sourceIds: [...sourceIds],
      status: published ? "published" : "draft",
    });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as TypedField] ??= issue.message;
      return show(next);
    }
    const input = parsed.data;

    startTransition(async () => {
      const changes = extract ? changesFrom(extract, input) : null;
      if (changes && Object.keys(changes).length === 0) return onDone();
      const result =
        changes && extract
          ? await saveExtractAction(extract.id, changes)
          : await createExtractAction(candidacy.id, input);
      if (!result.ok) return show({ form: result.message });
      toast.add({ title: extract ? "Modifications enregistrées" : "Extrait ajouté", type: "success" });
      onDone();
    });
  };

  const fieldProps = (field: TypedField) => ({
    id: ids[field],
    value: values[field],
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${ids[field]}-error` : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
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
          <Field data-invalid={errors.quote ? true : undefined}>
            <FieldLabel htmlFor={ids.quote}>Citation</FieldLabel>
            <Textarea
              {...fieldProps("quote")}
              rows={7}
              maxLength={QUOTE_MAX_LENGTH}
              aria-describedby={`${ids.quote}-help${errors.quote ? ` ${ids.quote}-error` : ""}`}
            />
            <FieldDescription id={`${ids.quote}-help`}>
              Mot pour mot, telle qu’elle figure dans le programme. Une modification remplace la version précédente.
            </FieldDescription>
            {error("quote")}
          </Field>
          <Field data-invalid={errors.recordedOn ? true : undefined}>
            <FieldLabel htmlFor={ids.recordedOn}>Relevé le</FieldLabel>
            <div className="flex flex-wrap items-center gap-2">
              <Input {...fieldProps("recordedOn")} type="date" className="w-44" />
              {values.recordedOn !== today && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setValues((current) => ({ ...current, recordedOn: today }))}
                >
                  Aujourd’hui
                </Button>
              )}
            </div>
            {error("recordedOn")}
          </Field>
        </FieldGroup>

        <SourcePicker sources={sources} selected={sourceIds} onChange={setSourceIds} content="l’extrait" />

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={ids.published}>En ligne</FieldLabel>
            <FieldDescription>
              {published
                ? "Visible dans le programme dès l’enregistrement, si la candidature est en ligne."
                : "Brouillon : invisible sur le site."}
            </FieldDescription>
          </FieldContent>
          <Switch id={ids.published} checked={published} onCheckedChange={setPublished} />
        </Field>

        {errors.form && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}

        {extract && <Deletion extract={extract} onRemoved={onDone} />}
      </form>

      <SheetFooter className="flex-row justify-end border-t p-6">
        <SheetClose render={<Button variant="outline" />}>Annuler</SheetClose>
        <Button type="submit" form={formId} disabled={pending} focusableWhenDisabled>
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? "Enregistrement…" : extract ? "Enregistrer" : "Ajouter l’extrait"}
        </Button>
      </SheetFooter>
    </>
  );
}

// Kept at the bottom of the sheet, away from the list: deleting is rare and cannot be undone.
function Deletion({ extract, onRemoved }: { extract: EditableExtract; onRemoved: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setConfirming(false);
    startTransition(async () => {
      const result = await removeExtractAction(extract.id);
      if (!result.ok) return void toast.add({ title: result.message, type: "error" });
      toast.add({ title: "Extrait supprimé", type: "success" });
      onRemoved();
    });
  };

  return (
    <>
      <FieldSeparator />
      <FieldSet>
        <FieldLegend>Suppression</FieldLegend>
        <FieldDescription>L’extrait disparaît du programme. La suppression est définitive.</FieldDescription>
        <div>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => setConfirming(true)}>
            Supprimer l’extrait
          </Button>
        </div>
      </FieldSet>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l’extrait ?</AlertDialogTitle>
            <AlertDialogDescription>Il disparaît du programme. Cette action est définitive.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Supprimer l’extrait
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Only what changed is sent, so a save never brings back a value another editor changed.
function changesFrom(extract: EditableExtract, input: ReturnType<typeof newExtractSchema.parse>): ExtractChanges {
  const changes: ExtractChanges = {};
  for (const field of ["subtopicId", "quote", "recordedOn", "status"] as const) {
    if (input[field] !== extract[field]) Object.assign(changes, { [field]: input[field] });
  }
  const sameSources =
    input.sourceIds.length === extract.sourceIds.length && input.sourceIds.every((id) => extract.sourceIds.includes(id));
  if (!sameSources) changes.sourceIds = input.sourceIds;
  return changes;
}
