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
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

import { createSourceAction, editSourceAction, removeSourceAction } from "../actions";
import { todayInParis } from "../source-dates";
import { sourceKindLabels, sourceKinds } from "../source-kinds";
import type { Source, SourceChanges, SourceInput } from "../sources";
import {
  newSourceSchema,
  ORGANIZATION_MAX_LENGTH,
  SOURCE_TITLE_MAX_LENGTH,
  URL_MAX_LENGTH,
} from "../validation";

type SourceSheetProps = {
  // null to create a new source.
  source: Source | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where the focus goes once the sheet closes: the row or button that opened it.
  returnFocus: () => HTMLElement | null;
  // Called with true just before the source is deleted, and with false if the deletion fails.
  onRemovingSource: (removing: boolean) => void;
};

type SourceField = keyof SourceInput;

type Errors = Partial<Record<SourceField | "form", string>>;

const fieldOrder: SourceField[] = ["title", "organization", "url", "consultedOn", "kind"];

export function SourceSheet({ source, open, onOpenChange, returnFocus, onRemovingSource }: SourceSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full sm:max-w-md" finalFocus={() => returnFocus() ?? true}>
        <SheetHeader className="border-b p-6">
          <SheetTitle>{source ? "Modifier la source" : "Nouvelle source"}</SheetTitle>
          <SheetDescription>Elle apparaît telle quelle sur la page Sources du site.</SheetDescription>
        </SheetHeader>
        {/* Keyed by source so the fields start again from the source shown. */}
        <SourceForm
          key={source?.id ?? "new"}
          source={source}
          onDone={() => onOpenChange(false)}
          onRemovingSource={onRemovingSource}
        />
      </SheetContent>
    </Sheet>
  );
}


type SourceFormProps = {
  source: Source | null;
  onDone: () => void;
  onRemovingSource: (removing: boolean) => void;
};

function SourceForm({ source, onDone, onRemovingSource }: SourceFormProps) {
  const [values, setValues] = useState<Record<SourceField, string>>(() => ({
    title: source?.title ?? "",
    organization: source?.organization ?? "",
    url: source?.url ?? "",
    consultedOn: source?.consultedOn ?? todayInParis(),
    kind: source?.kind ?? "",
  }));
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const formId = useId();
  const ids: Record<SourceField, string> = {
    title: useId(),
    organization: useId(),
    url: useId(),
    consultedOn: useId(),
    kind: useId(),
  };

  const show = (next: Errors) => {
    setErrors(next);
    const first = fieldOrder.find((field) => next[field]);
    if (first) document.getElementById(ids[first])?.focus();
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = newSourceSchema.safeParse(values);
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as SourceField;
        next[field] ??= issue.message;
      }
      return show(next);
    }
    const input = parsed.data;

    startTransition(async () => {
      const changes = source ? changesFrom(source, input) : null;
      if (changes && Object.keys(changes).length === 0) return onDone();
      const result = changes && source ? await editSourceAction(source.id, changes) : await createSourceAction(input);
      if (!result.ok) return show({ form: result.message });
      toast.add({ title: source ? "Modifications enregistrées" : "Source ajoutée", type: "success" });
      onDone();
    });
  };

  const fieldProps = (field: SourceField) => ({
    id: ids[field],
    value: values[field],
    "aria-invalid": errors[field] ? true : undefined,
    "aria-describedby": errors[field] ? `${ids[field]}-error` : undefined,
    onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setValues((current) => ({ ...current, [field]: event.target.value })),
  });

  const error = (field: SourceField) => <FieldError id={`${ids[field]}-error`}>{errors[field]}</FieldError>;

  return (
    <>
      <form id={formId} noValidate onSubmit={submit} className="flex flex-1 flex-col gap-8 overflow-y-auto p-6">
        <FieldGroup>
          <Field data-invalid={errors.title ? true : undefined}>
            <FieldLabel htmlFor={ids.title}>Titre</FieldLabel>
            <Input
              {...fieldProps("title")}
              autoComplete="off"
              maxLength={SOURCE_TITLE_MAX_LENGTH}
              placeholder="Ex. Programme pour l’Horizon 2027…"
            />
            {error("title")}
          </Field>
          <Field data-invalid={errors.organization ? true : undefined}>
            <FieldLabel htmlFor={ids.organization}>Organisme</FieldLabel>
            <Input
              {...fieldProps("organization")}
              autoComplete="off"
              maxLength={ORGANIZATION_MAX_LENGTH}
              placeholder="Ex. Assemblée nationale…"
            />
            {error("organization")}
          </Field>
          <Field data-invalid={errors.url ? true : undefined}>
            <FieldLabel htmlFor={ids.url}>Lien</FieldLabel>
            <Input
              {...fieldProps("url")}
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              maxLength={URL_MAX_LENGTH}
              placeholder="https://…"
            />
            {error("url")}
          </Field>
          <div className="flex flex-wrap gap-4">
            <Field data-invalid={errors.consultedOn ? true : undefined} className="w-auto">
              <FieldLabel htmlFor={ids.consultedOn}>Consultée le</FieldLabel>
              <Input {...fieldProps("consultedOn")} type="date" className="w-44" />
              {error("consultedOn")}
            </Field>
            <Field data-invalid={errors.kind ? true : undefined} className="w-auto">
              <FieldLabel htmlFor={ids.kind}>Type</FieldLabel>
              <NativeSelect {...fieldProps("kind")} className="w-44">
                <NativeSelectOption value="" disabled>
                  Choisir…
                </NativeSelectOption>
                {sourceKinds.map((kind) => (
                  <NativeSelectOption key={kind} value={kind}>
                    {sourceKindLabels[kind]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {error("kind")}
            </Field>
          </div>
        </FieldGroup>

        {errors.form && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}

        {source && <Deletion source={source} onRemoved={onDone} onRemovingSource={onRemovingSource} />}
      </form>

      <SheetFooter className="flex-row justify-end border-t p-6">
        <SheetClose render={<Button variant="outline" />}>Annuler</SheetClose>
        <Button type="submit" form={formId} disabled={pending} focusableWhenDisabled>
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? "Enregistrement…" : source ? "Enregistrer" : "Ajouter la source"}
        </Button>
      </SheetFooter>
    </>
  );
}

type DeletionProps = {
  source: Source;
  onRemoved: () => void;
  onRemovingSource: (removing: boolean) => void;
};

// Kept at the bottom of the sheet, away from the list: deleting is rare and cannot be undone.
function Deletion({ source, onRemoved, onRemovingSource }: DeletionProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setConfirming(false);
    startTransition(async () => {
      onRemovingSource(true);
      const result = await removeSourceAction(source.id);
      if (result.ok) {
        toast.add({ title: "Source supprimée", type: "success" });
        onRemoved();
      } else {
        toast.add({ title: result.message, type: "error" });
        onRemovingSource(false);
      }
    });
  };

  return (
    <>
      <FieldSeparator />
      <FieldSet>
        <FieldLegend>Suppression</FieldLegend>
        <FieldDescription>
          La source disparaît de la page Sources. Une source qui étaye un contenu ne peut pas être supprimée. La
          suppression est définitive.
        </FieldDescription>
        <div>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => setConfirming(true)}>
            Supprimer la source
          </Button>
        </div>
      </FieldSet>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la source « {source.title} » ?</AlertDialogTitle>
            <AlertDialogDescription>
              Elle disparaît de la page Sources du site. Cette action est définitive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Supprimer la source
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Only what changed is sent, so a save never brings back a value another editor changed.
function changesFrom(source: Source, input: SourceInput): SourceChanges {
  const changes: SourceChanges = {};
  for (const field of fieldOrder) {
    if (input[field] !== source[field]) Object.assign(changes, { [field]: input[field] });
  }
  return changes;
}
