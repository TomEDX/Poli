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
import { Checkbox } from "@/components/ui/checkbox";
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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
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
import type { Source } from "@/modules/reference/sources/queries";
import type { TopicTree } from "@/modules/reference/topics/queries";
import { URL_MAX_LENGTH } from "@/modules/reference/validation";

import { createTextAction, removeTextAction, saveTextAction } from "../../actions";
import { noSubtopicMessage, textNatureLabels, textNatures, textReference } from "../vocabulary";
import type { EditableText, TextChanges } from "../queries";
import { SUMMARY_MAX_LENGTH } from "../../form-fields";
import { newTextSchema, OFFICIAL_TITLE_MAX_LENGTH } from "../validation";

type TextSheetProps = {
  // null to create a new text.
  text: EditableText | null;
  topicTree: TopicTree;
  // Every source the text can be linked to.
  sources: Source[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where the focus goes once the sheet closes: the row or button that opened it.
  returnFocus: () => HTMLElement | null;
  // Called with true just before the text is deleted, and with false if the deletion fails.
  onRemovingText: (removing: boolean) => void;
};

type TypedField = "nature" | "number" | "officialTitle" | "filedOn" | "officialUrl" | "summary";

type Errors = Partial<Record<TypedField | "subtopicIds" | "form", string>>;

const fieldOrder: (TypedField | "subtopicIds")[] = [
  "nature",
  "number",
  "filedOn",
  "officialTitle",
  "officialUrl",
  "summary",
  "subtopicIds",
];

export function TextSheet({ text, topicTree, sources, open, onOpenChange, returnFocus, onRemovingText }: TextSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full sm:max-w-lg" finalFocus={() => returnFocus() ?? true}>
        <SheetHeader className="border-b p-6">
          <SheetTitle>{text ? "Modifier le texte" : "Nouveau texte"}</SheetTitle>
          <SheetDescription>
            {text ? textReference(text) : "Projet ou proposition de loi examiné à l’Assemblée."}
          </SheetDescription>
        </SheetHeader>
        {/* Keyed by text so the fields start again from the text shown. */}
        <TextForm
          key={text?.id ?? "new"}
          text={text}
          topicTree={topicTree}
          sources={sources}
          onDone={() => onOpenChange(false)}
          onRemovingText={onRemovingText}
        />
      </SheetContent>
    </Sheet>
  );
}

type TextFormProps = {
  text: EditableText | null;
  topicTree: TopicTree;
  sources: Source[];
  onDone: () => void;
  onRemovingText: (removing: boolean) => void;
};

function TextForm({ text, topicTree, sources, onDone, onRemovingText }: TextFormProps) {
  const [values, setValues] = useState<Record<TypedField, string>>(() => ({
    nature: text?.nature ?? "",
    number: text ? String(text.number) : "",
    officialTitle: text?.officialTitle ?? "",
    filedOn: text?.filedOn ?? "",
    officialUrl: text?.officialUrl ?? "",
    summary: text?.summary ?? "",
  }));
  const [subtopicIds, setSubtopicIds] = useState(() => new Set(text?.subtopicIds ?? []));
  const [sourceIds, setSourceIds] = useState<ReadonlySet<string>>(() => new Set(text?.sourceIds ?? []));
  const [published, setPublished] = useState(text?.status === "published");
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const formId = useId();
  const ids: Record<TypedField | "subtopicIds" | "published", string> = {
    nature: useId(),
    number: useId(),
    officialTitle: useId(),
    filedOn: useId(),
    officialUrl: useId(),
    summary: useId(),
    subtopicIds: useId(),
    published: useId(),
  };

  const show = (next: Errors) => {
    setErrors(next);
    const first = fieldOrder.find((field) => next[field]);
    if (first) document.getElementById(ids[first])?.focus();
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = newTextSchema.safeParse({
      ...values,
      subtopicIds: [...subtopicIds],
      sourceIds: [...sourceIds],
      status: published ? "published" : "draft",
    });
    const next: Errors = {};
    for (const issue of parsed.error?.issues ?? []) {
      const field = issue.path[0] as TypedField;
      next[field] ??= issue.message;
    }
    if (published && subtopicIds.size === 0) next.subtopicIds = noSubtopicMessage;
    if (!parsed.success || next.subtopicIds) return show(next);
    const input = parsed.data;

    startTransition(async () => {
      const changes = text ? changesFrom(text, input) : null;
      if (changes && Object.keys(changes).length === 0) return onDone();
      const result = changes && text ? await saveTextAction(text.id, changes) : await createTextAction(input);
      if (!result.ok) return show({ form: result.message });
      toast.add({ title: text ? "Modifications enregistrées" : "Texte ajouté", type: "success" });
      onDone();
    });
  };

  const toggleSubtopic = (id: string, checked: boolean) =>
    setSubtopicIds((current) => {
      const next = new Set(current);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });

  const fieldProps = (field: TypedField) => ({
    id: ids[field],
    value: values[field],
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${ids[field]}-error` : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setValues((current) => ({ ...current, [field]: event.target.value })),
  });

  const error = (field: TypedField | "subtopicIds") => (
    <FieldError id={`${ids[field]}-error`}>{errors[field]}</FieldError>
  );

  return (
    <>
      <form id={formId} noValidate onSubmit={submit} className="flex flex-1 flex-col gap-8 overflow-y-auto p-6">
        <FieldGroup>
          <div className="flex flex-wrap gap-4">
            <Field data-invalid={errors.nature ? true : undefined} className="w-auto">
              <FieldLabel htmlFor={ids.nature}>Nature</FieldLabel>
              <NativeSelect {...fieldProps("nature")} className="w-52">
                <NativeSelectOption value="" disabled>
                  Choisir…
                </NativeSelectOption>
                {textNatures.map((nature) => (
                  <NativeSelectOption key={nature} value={nature}>
                    {textNatureLabels[nature]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {error("nature")}
            </Field>
            <Field data-invalid={errors.number ? true : undefined} className="w-auto">
              <FieldLabel htmlFor={ids.number}>Numéro</FieldLabel>
              <Input {...fieldProps("number")} inputMode="numeric" autoComplete="off" className="w-28" placeholder="Ex. 105" />
              {error("number")}
            </Field>
            <Field data-invalid={errors.filedOn ? true : undefined} className="w-auto">
              <FieldLabel htmlFor={ids.filedOn}>Déposé le</FieldLabel>
              <Input {...fieldProps("filedOn")} type="date" className="w-44" />
              {error("filedOn")}
            </Field>
          </div>
          <Field data-invalid={errors.officialTitle ? true : undefined}>
            <FieldLabel htmlFor={ids.officialTitle}>Titre officiel</FieldLabel>
            <Textarea
              {...fieldProps("officialTitle")}
              rows={2}
              maxLength={OFFICIAL_TITLE_MAX_LENGTH}
              placeholder="Tel qu’il figure sur le site de l’Assemblée…"
            />
            {error("officialTitle")}
          </Field>
          <Field data-invalid={errors.officialUrl ? true : undefined}>
            <FieldLabel htmlFor={ids.officialUrl}>Lien officiel (facultatif)</FieldLabel>
            <Input
              {...fieldProps("officialUrl")}
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              maxLength={URL_MAX_LENGTH}
              placeholder="https://www.assemblee-nationale.fr/…"
            />
            {error("officialUrl")}
          </Field>
          <Field data-invalid={errors.summary ? true : undefined}>
            <FieldLabel htmlFor={ids.summary}>Résumé éditorial</FieldLabel>
            <Textarea
              {...fieldProps("summary")}
              rows={5}
              maxLength={SUMMARY_MAX_LENGTH}
              aria-describedby={`${ids.summary}-help${errors.summary ? ` ${ids.summary}-error` : ""}`}
            />
            <FieldDescription id={`${ids.summary}-help`}>
              En langage courant. Le site le présente comme un résumé rédigé par Poli., distinct du texte officiel.
            </FieldDescription>
            {error("summary")}
          </Field>
        </FieldGroup>

        <FieldSet data-invalid={errors.subtopicIds ? true : undefined}>
          <FieldLegend>Sous-thématiques</FieldLegend>
          <FieldDescription>Le texte ressort dans chaque sous-thématique cochée.</FieldDescription>
          {/* Focused when no subtopic is checked, so the error is read out where it applies. */}
          <div
            id={ids.subtopicIds}
            tabIndex={-1}
            aria-describedby={errors.subtopicIds ? `${ids.subtopicIds}-error` : undefined}
            className="flex flex-col gap-6 rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {topicTree.every((topic) => topic.subtopics.length === 0) ? (
              <p className="text-sm text-muted-foreground">
                Aucune sous-thématique : créez-en dans Thématiques avant de rattacher le texte.
              </p>
            ) : (
              topicTree
                .filter((topic) => topic.subtopics.length > 0)
                .map((topic) => (
                  <FieldSet key={topic.id} className="gap-3">
                    <FieldLegend variant="label" className="text-muted-foreground">
                      {topic.name}
                    </FieldLegend>
                    <FieldGroup className="gap-3">
                      {topic.subtopics.map((subtopic) => {
                        const id = `${ids.subtopicIds}-${subtopic.id}`;
                        return (
                          <Field key={subtopic.id} orientation="horizontal">
                            <Checkbox
                              id={id}
                              checked={subtopicIds.has(subtopic.id)}
                              onCheckedChange={(checked) => toggleSubtopic(subtopic.id, checked)}
                            />
                            <FieldLabel htmlFor={id} className="font-normal">
                              {subtopic.name}
                            </FieldLabel>
                          </Field>
                        );
                      })}
                    </FieldGroup>
                  </FieldSet>
                ))
            )}
          </div>
          {error("subtopicIds")}
        </FieldSet>

        <SourcePicker sources={sources} selected={sourceIds} onChange={setSourceIds} content="le texte" />

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={ids.published}>En ligne</FieldLabel>
            <FieldDescription>
              {published ? "Visible sur le site dès l’enregistrement." : "Brouillon : invisible sur le site."}
            </FieldDescription>
          </FieldContent>
          <Switch id={ids.published} checked={published} onCheckedChange={setPublished} />
        </Field>

        {errors.form && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}

        {text && <Deletion text={text} onRemoved={onDone} onRemovingText={onRemovingText} />}
      </form>

      <SheetFooter className="flex-row justify-end border-t p-6">
        <SheetClose render={<Button variant="outline" />}>Annuler</SheetClose>
        <Button type="submit" form={formId} disabled={pending} focusableWhenDisabled>
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? "Enregistrement…" : text ? "Enregistrer" : "Ajouter le texte"}
        </Button>
      </SheetFooter>
    </>
  );
}

type DeletionProps = {
  text: EditableText;
  onRemoved: () => void;
  onRemovingText: (removing: boolean) => void;
};

// Kept at the bottom of the sheet, away from the list: deleting is rare and cannot be undone.
function Deletion({ text, onRemoved, onRemovingText }: DeletionProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setConfirming(false);
    startTransition(async () => {
      onRemovingText(true);
      const result = await removeTextAction(text.id);
      if (result.ok) {
        toast.add({ title: "Texte supprimé", type: "success" });
        onRemoved();
      } else {
        toast.add({ title: result.message, type: "error" });
        onRemovingText(false);
      }
    });
  };

  return (
    <>
      <FieldSeparator />
      <FieldSet>
        <FieldLegend>Suppression</FieldLegend>
        <FieldDescription>Le texte disparaît du site. La suppression est définitive.</FieldDescription>
        <div>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => setConfirming(true)}>
            Supprimer le texte
          </Button>
        </div>
      </FieldSet>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le {textReference(text).toLowerCase()} ?</AlertDialogTitle>
            <AlertDialogDescription>Il disparaît du site. Cette action est définitive.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Supprimer le texte
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Only what changed is sent, so a save never brings back a value another editor changed.
function changesFrom(text: EditableText, input: ReturnType<typeof newTextSchema.parse>): TextChanges {
  const changes: TextChanges = {};
  for (const field of ["nature", "number", "officialTitle", "filedOn", "officialUrl", "summary", "status"] as const) {
    if (input[field] !== text[field]) Object.assign(changes, { [field]: input[field] });
  }
  if (!sameIds(input.subtopicIds, text.subtopicIds)) changes.subtopicIds = input.subtopicIds;
  if (!sameIds(input.sourceIds, text.sourceIds)) changes.sourceIds = input.sourceIds;
  return changes;
}

function sameIds(picked: string[], saved: string[]): boolean {
  return picked.length === saved.length && picked.every((id) => saved.includes(id));
}
