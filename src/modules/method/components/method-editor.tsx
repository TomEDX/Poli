"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import type { z } from "zod";

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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import type { ActionResult } from "@/modules/editors/editor-write";

import { publishMethodAction, saveMethodDraftAction, unpublishMethodAction } from "../actions";
import type { EditableMethod } from "../queries";
import { methodDraftSchema, publishedMethodSchema, SECTION_MAX_LENGTH } from "../validation";
import { formatPublishedOn, type MethodSectionKey, methodSections, type MethodSections } from "../vocabulary";

type Errors = Partial<Record<MethodSectionKey | "form", string>>;

type Pending = "draft" | "publish" | "unpublish" | null;

export function MethodEditor({ method }: { method: EditableMethod }) {
  const [values, setValues] = useState<MethodSections>(method.draft);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState<Pending>(null);
  const [, startTransition] = useTransition();
  const formId = useId();
  const ids: Record<MethodSectionKey, string> = {
    candidacyCriteria: useId(),
    textCriteria: useId(),
    scoreFormula: useId(),
  };

  const show = (next: Errors) => {
    setErrors(next);
    const first = methodSections.find((section) => next[section.key]);
    if (first) document.getElementById(ids[first.key])?.focus();
  };

  const write = (
    kind: Exclude<Pending, null>,
    schema: z.ZodType<MethodSections> | null,
    action: (sections: MethodSections) => Promise<ActionResult>,
    success: string,
  ) => {
    let sections = values;
    if (schema) {
      const parsed = schema.safeParse(values);
      if (!parsed.success) {
        const next: Errors = {};
        for (const issue of parsed.error.issues) next[issue.path[0] as MethodSectionKey] ??= issue.message;
        return show(next);
      }
      sections = parsed.data;
    }
    setErrors({});
    setPending(kind);
    startTransition(async () => {
      const result = await action(sections);
      setPending(null);
      if (!result.ok) return show({ form: result.message });
      toast.add({ title: success, type: "success" });
    });
  };

  const saveDraft = () => write("draft", methodDraftSchema, saveMethodDraftAction, "Brouillon enregistré");
  const publish = () => write("publish", publishedMethodSchema, publishMethodAction, "Page Méthode publiée");
  const unpublish = () => write("unpublish", null, () => unpublishMethodAction(), "Page Méthode retirée du site");

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Page Méthode</h1>
        <p className="text-sm text-muted-foreground">
          Le public la lit pour juger de la neutralité de Poli. Enregistrez un brouillon autant de fois que nécessaire :
          le site ne change qu’au moment où vous publiez.
        </p>
        <PublicationStatus method={method} />
      </div>

      <form
        id={formId}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          publish();
        }}
        className="flex flex-col gap-8"
      >
        <FieldGroup>
          {methodSections.map((section) => (
            <Field key={section.key} data-invalid={errors[section.key] ? true : undefined}>
              <FieldLabel htmlFor={ids[section.key]}>{section.title}</FieldLabel>
              <FieldDescription>{section.hint}</FieldDescription>
              <Textarea
                id={ids[section.key]}
                value={values[section.key]}
                maxLength={SECTION_MAX_LENGTH}
                className="min-h-40"
                aria-invalid={errors[section.key] ? true : undefined}
                aria-describedby={errors[section.key] ? `${ids[section.key]}-error` : undefined}
                onChange={(event) => setValues((current) => ({ ...current, [section.key]: event.target.value }))}
              />
              <FieldError id={`${ids[section.key]}-error`}>{errors[section.key]}</FieldError>
            </Field>
          ))}
        </FieldGroup>

        {errors.form && (
          <Alert variant="destructive">
            <AlertDescription>{errors.form}</AlertDescription>
          </Alert>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" disabled={pending !== null} focusableWhenDisabled>
            {pending === "publish" && <Spinner data-icon="inline-start" />}
            {pending === "publish" ? "Publication…" : "Publier"}
          </Button>
          <Button type="button" variant="outline" disabled={pending !== null} focusableWhenDisabled onClick={saveDraft}>
            {pending === "draft" && <Spinner data-icon="inline-start" />}
            {pending === "draft" ? "Enregistrement…" : "Enregistrer le brouillon"}
          </Button>
          {method.publication !== "none" && <Unpublish disabled={pending !== null} onConfirm={unpublish} />}
        </div>
      </form>
    </div>
  );
}

function PublicationStatus({ method }: { method: EditableMethod }) {
  if (method.publication === "none" || !method.publishedAt) {
    return <p className="text-sm font-medium">Non publiée : le public ne voit pas encore cette page.</p>;
  }
  return (
    <p className="text-sm">
      <span className="font-medium">Publiée le {formatPublishedOn(method.publishedAt)}</span>
      {method.publication === "outdated" && (
        <span className="text-muted-foreground"> · le brouillon contient des modifications non publiées</span>
      )}
      {" · "}
      <Link href="/methode" className="underline underline-offset-4">
        Voir la page publique
      </Link>
    </p>
  );
}

// Confirmed first: the page disappears from the site, and the links to it lead to an empty page.
function Unpublish({ disabled, onConfirm }: { disabled: boolean; onConfirm: () => void }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <Button type="button" variant="ghost" disabled={disabled} onClick={() => setConfirming(true)}>
        Retirer du site
      </Button>
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer la page Méthode du site ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le public ne la voit plus. Son texte reste en brouillon et peut être publié de nouveau.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                setConfirming(false);
                onConfirm();
              }}
            >
              Retirer du site
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
