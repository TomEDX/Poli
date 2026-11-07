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
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { ParliamentaryGroup } from "@/modules/reference/parliamentary-groups";

import { createAmendmentAction, removeAmendmentAction, saveAmendmentAction } from "../actions";
import { amendmentFateLabels, amendmentFates, amendmentOpinionLabels, amendmentOpinions } from "../amendment-kinds";
import { amendmentReference } from "../amendment-labels";
import { AUTHOR_LABEL_MAX_LENGTH, amendmentSchema, COSIGNATORIES_MAX_LENGTH } from "../amendment-validation";
import type { Amendment } from "../amendments";
import { SUMMARY_MAX_LENGTH } from "../validation";

type AmendmentSheetProps = {
  textId: string;
  // null to create a new amendment.
  amendment: Amendment | null;
  // The groups of the current legislature, in the official order.
  groups: ParliamentaryGroup[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Where the focus goes once the sheet closes: the row or button that opened it.
  returnFocus: () => HTMLElement | null;
};

type TypedField =
  | "number"
  | "authorLabel"
  | "authorGroupId"
  | "cosignatories"
  | "summary"
  | "fate"
  | "governmentOpinion"
  | "committeeOpinion";

type Errors = Partial<Record<TypedField | "form", string>>;

const fieldOrder: TypedField[] = [
  "number",
  "authorLabel",
  "authorGroupId",
  "cosignatories",
  "summary",
  "fate",
  "governmentOpinion",
  "committeeOpinion",
];

export function AmendmentSheet({ textId, amendment, groups, open, onOpenChange, returnFocus }: AmendmentSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 data-[side=right]:w-full sm:max-w-xl" finalFocus={() => returnFocus() ?? true}>
        <SheetHeader className="border-b p-6">
          <SheetTitle>{amendment ? "Modifier l’amendement" : "Nouvel amendement"}</SheetTitle>
          <SheetDescription>
            {amendment ? amendmentReference(amendment) : "Il apparaît sous le texte une fois en ligne."}
          </SheetDescription>
        </SheetHeader>
        {/* Keyed by amendment so the fields start again from the amendment shown. */}
        <AmendmentForm
          key={amendment?.id ?? "new"}
          textId={textId}
          amendment={amendment}
          groups={groups}
          onDone={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

type AmendmentFormProps = {
  textId: string;
  amendment: Amendment | null;
  groups: ParliamentaryGroup[];
  onDone: () => void;
};

function AmendmentForm({ textId, amendment, groups, onDone }: AmendmentFormProps) {
  const [values, setValues] = useState<Record<TypedField, string>>(() => ({
    number: amendment ? String(amendment.number) : "",
    authorLabel: amendment?.authorLabel ?? "",
    authorGroupId: amendment?.authorGroupId ?? "",
    cosignatories: amendment?.cosignatories ?? "",
    summary: amendment?.summary ?? "",
    fate: amendment?.fate ?? "",
    governmentOpinion: amendment?.governmentOpinion ?? "none",
    committeeOpinion: amendment?.committeeOpinion ?? "none",
  }));
  const [published, setPublished] = useState(amendment?.status === "published");
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const formId = useId();
  const publishedId = useId();
  const ids: Record<TypedField, string> = {
    number: useId(),
    authorLabel: useId(),
    authorGroupId: useId(),
    cosignatories: useId(),
    summary: useId(),
    fate: useId(),
    governmentOpinion: useId(),
    committeeOpinion: useId(),
  };

  const show = (next: Errors) => {
    setErrors(next);
    const first = fieldOrder.find((field) => next[field]);
    if (first) document.getElementById(ids[first])?.focus();
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = amendmentSchema.safeParse({ ...values, status: published ? "published" : "draft" });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) next[issue.path[0] as TypedField] ??= issue.message;
      return show(next);
    }

    startTransition(async () => {
      const result = amendment
        ? await saveAmendmentAction(amendment.id, parsed.data)
        : await createAmendmentAction(textId, parsed.data);
      if (!result.ok) return show({ form: result.message });
      toast.add({ title: amendment ? "Modifications enregistrées" : "Amendement ajouté", type: "success" });
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
          <div className="flex flex-wrap gap-4">
            <Field data-invalid={errors.number ? true : undefined} className="w-auto">
              <FieldLabel htmlFor={ids.number}>Numéro</FieldLabel>
              <Input {...fieldProps("number")} inputMode="numeric" autoComplete="off" className="w-28" placeholder="Ex. 12" />
              {error("number")}
            </Field>
            <Field data-invalid={errors.fate ? true : undefined} className="w-auto">
              <FieldLabel htmlFor={ids.fate}>Sort</FieldLabel>
              <NativeSelect {...fieldProps("fate")} className="w-44">
                <NativeSelectOption value="" disabled>
                  Choisir…
                </NativeSelectOption>
                {amendmentFates.map((fate) => (
                  <NativeSelectOption key={fate} value={fate}>
                    {amendmentFateLabels[fate]}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              {error("fate")}
            </Field>
          </div>
          <Field data-invalid={errors.authorLabel ? true : undefined}>
            <FieldLabel htmlFor={ids.authorLabel}>Auteur</FieldLabel>
            <Input
              {...fieldProps("authorLabel")}
              autoComplete="off"
              maxLength={AUTHOR_LABEL_MAX_LENGTH}
              placeholder="Ex. Mme Claire Martin, ou le Gouvernement"
            />
            {error("authorLabel")}
          </Field>
          <Field data-invalid={errors.authorGroupId ? true : undefined}>
            <FieldLabel htmlFor={ids.authorGroupId}>Groupe de l’auteur (facultatif)</FieldLabel>
            <NativeSelect {...fieldProps("authorGroupId")} className="w-full">
              <NativeSelectOption value="">Aucun groupe</NativeSelectOption>
              {groups.map((group) => (
                <NativeSelectOption key={group.id} value={group.id}>
                  {group.name} ({group.abbreviation})
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {error("authorGroupId")}
          </Field>
          <Field data-invalid={errors.cosignatories ? true : undefined}>
            <FieldLabel htmlFor={ids.cosignatories}>Cosignataires (facultatif)</FieldLabel>
            <Input
              {...fieldProps("cosignatories")}
              autoComplete="off"
              maxLength={COSIGNATORIES_MAX_LENGTH}
              placeholder="Ex. M. Paul Durand et 14 autres députés"
            />
            {error("cosignatories")}
          </Field>
          <Field data-invalid={errors.summary ? true : undefined}>
            <FieldLabel htmlFor={ids.summary}>Résumé éditorial</FieldLabel>
            <Textarea
              {...fieldProps("summary")}
              rows={4}
              maxLength={SUMMARY_MAX_LENGTH}
              aria-describedby={`${ids.summary}-help${errors.summary ? ` ${ids.summary}-error` : ""}`}
            />
            <FieldDescription id={`${ids.summary}-help`}>
              En langage courant. Le site le présente comme un résumé rédigé par Poli.
            </FieldDescription>
            {error("summary")}
          </Field>
          <div className="flex flex-wrap gap-4">
            {(
              [
                ["governmentOpinion", "Avis du gouvernement"],
                ["committeeOpinion", "Avis de la commission"],
              ] as const
            ).map(([field, label]) => (
              <Field key={field} data-invalid={errors[field] ? true : undefined} className="w-auto">
                <FieldLabel htmlFor={ids[field]}>{label}</FieldLabel>
                <NativeSelect {...fieldProps(field)} className="w-44">
                  {amendmentOpinions.map((opinion) => (
                    <NativeSelectOption key={opinion} value={opinion}>
                      {amendmentOpinionLabels[opinion]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {error(field)}
              </Field>
            ))}
          </div>
        </FieldGroup>

        <Field orientation="horizontal">
          <FieldContent>
            <FieldLabel htmlFor={publishedId}>En ligne</FieldLabel>
            <FieldDescription>
              {published
                ? "Visible sous le texte dès l’enregistrement, si le texte est en ligne."
                : "Brouillon : invisible sur le site."}
            </FieldDescription>
          </FieldContent>
          <Switch id={publishedId} checked={published} onCheckedChange={setPublished} />
        </Field>

        {errors.form && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}

        {amendment && <Deletion amendment={amendment} onRemoved={onDone} />}
      </form>

      <SheetFooter className="flex-row justify-end border-t p-6">
        <SheetClose render={<Button variant="outline" />}>Annuler</SheetClose>
        <Button type="submit" form={formId} disabled={pending} focusableWhenDisabled>
          {pending && <Spinner data-icon="inline-start" />}
          {pending ? "Enregistrement…" : amendment ? "Enregistrer" : "Ajouter l’amendement"}
        </Button>
      </SheetFooter>
    </>
  );
}

// Kept at the bottom of the sheet, away from the list: deleting is rare and cannot be undone.
function Deletion({ amendment, onRemoved }: { amendment: Amendment; onRemoved: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const remove = () => {
    setConfirming(false);
    startTransition(async () => {
      const result = await removeAmendmentAction(amendment.id);
      if (!result.ok) {
        toast.add({ title: result.message, type: "error" });
        return;
      }
      toast.add({ title: "Amendement supprimé", type: "success" });
      onRemoved();
    });
  };

  return (
    <>
      <FieldSeparator />
      <FieldSet>
        <FieldLegend>Suppression</FieldLegend>
        <FieldDescription>
          L’amendement disparaît du site ; son scrutin, s’il en a un, reste dans les scrutins du texte. La suppression
          est définitive.
        </FieldDescription>
        <div>
          <Button type="button" variant="destructive" disabled={pending} onClick={() => setConfirming(true)}>
            Supprimer l’amendement
          </Button>
        </div>
      </FieldSet>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l’{amendmentReference(amendment).toLowerCase()} ?</AlertDialogTitle>
            <AlertDialogDescription>Il disparaît du site. Cette action est définitive.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Supprimer l’amendement
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

