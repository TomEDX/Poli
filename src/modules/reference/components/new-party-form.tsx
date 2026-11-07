"use client";

import { useId, useRef, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { toast } from "@/components/ui/toast";

import { createPartyAction } from "../actions";
import type { PartyInput } from "../parties";
import { abbreviationTakenMessage, partyNameTakenMessage } from "../party-messages";
import { ABBREVIATION_MAX_LENGTH, NAME_MAX_LENGTH, newPartySchema } from "../validation";

type Errors = { name?: string; abbreviation?: string; form?: string };

// A party needs both a name and an abbreviation, so it is created from a small form
// rather than a single inline field.
export function NewPartyForm({ onClose }: { onClose: () => void }) {
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const nameInput = useRef<HTMLInputElement>(null);
  const abbreviationInput = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const nameId = useId();
  const abbreviationId = useId();

  const show = (next: Errors) => {
    setErrors(next);
    if (next.name) nameInput.current?.focus();
    else if (next.abbreviation) abbreviationInput.current?.focus();
  };

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    // A form action would reset the fields, so a refused name would have to be typed again.
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const parsed = newPartySchema.safeParse({ name: data.get("name"), abbreviation: data.get("abbreviation") });
    if (!parsed.success) {
      const message = (field: string) => parsed.error.issues.find((issue) => issue.path[0] === field)?.message;
      return show({ name: message("name"), abbreviation: message("abbreviation") });
    }
    startTransition(async () => {
      const result = await createPartyAction(parsed.data);
      if (result.ok) {
        toast.add({ title: `Parti « ${parsed.data.name} » ajouté`, type: "success" });
        onClose();
      } else {
        show(serverErrors(result.message, parsed.data));
      }
    });
  };

  return (
    <Card aria-labelledby={titleId}>
      <CardHeader>
        <CardTitle id={titleId}>Nouveau parti</CardTitle>
        <CardDescription>Vous pourrez ensuite créer sa candidature depuis le tableau.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          noValidate
          onSubmit={submit}
          onKeyDown={(event) => {
            // Escape only closes an empty form, so that nothing typed is lost by mistake.
            if (event.key === "Escape" && isEmpty(event.currentTarget)) onClose();
          }}
        >
          <FieldGroup>
            <Field data-invalid={errors.name ? true : undefined}>
              <FieldLabel htmlFor={nameId}>Nom du parti</FieldLabel>
              <Input
                ref={nameInput}
                id={nameId}
                name="name"
                autoFocus
                autoComplete="off"
                maxLength={NAME_MAX_LENGTH}
                placeholder="Ex. Parti de l’Horizon…"
                aria-invalid={errors.name ? true : undefined}
                aria-describedby={errors.name ? `${nameId}-error` : undefined}
              />
              <FieldError id={`${nameId}-error`}>{errors.name}</FieldError>
            </Field>
            <Field data-invalid={errors.abbreviation ? true : undefined} className="max-w-48">
              <FieldLabel htmlFor={abbreviationId}>Sigle</FieldLabel>
              <Input
                ref={abbreviationInput}
                id={abbreviationId}
                name="abbreviation"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={ABBREVIATION_MAX_LENGTH}
                placeholder="Ex. PDH…"
                aria-invalid={errors.abbreviation ? true : undefined}
                aria-describedby={errors.abbreviation ? `${abbreviationId}-error` : undefined}
              />
              <FieldError id={`${abbreviationId}-error`}>{errors.abbreviation}</FieldError>
            </Field>
            {errors.form && (
              <Alert variant="destructive">
                <AlertDescription>{errors.form}</AlertDescription>
              </Alert>
            )}
            <Field orientation="horizontal">
              <Button type="submit" disabled={pending} focusableWhenDisabled>
                {pending && <Spinner data-icon="inline-start" />}
                {pending ? "Ajout…" : "Ajouter le parti"}
              </Button>
              <Button type="button" variant="outline" onClick={onClose}>
                Annuler
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  );
}

function serverErrors(message: string, party: PartyInput): Errors {
  if (message === partyNameTakenMessage(party)) return { name: message };
  if (message === abbreviationTakenMessage(party)) return { abbreviation: message };
  return { form: message };
}

function isEmpty(form: HTMLFormElement): boolean {
  return [...new FormData(form).values()].every((value) => String(value).trim() === "");
}
