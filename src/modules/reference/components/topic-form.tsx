"use client";

import { useActionState, useId } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import type { TopicFormState } from "../actions";
import { NAME_MAX_LENGTH } from "../validation";

const initialState: TopicFormState = { status: "idle" };

type TopicFormProps = {
  action: (state: TopicFormState, formData: FormData) => Promise<TopicFormState>;
  hiddenFields?: Record<string, string>;
  name?: string;
  // Omitted when creating: the slug is then derived from the name.
  slug?: string;
  nameLabel: string;
  submitLabel: string;
};

export function TopicForm({ action, hiddenFields = {}, name = "", slug, nameLabel, submitLabel }: TopicFormProps) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const fieldId = useId();
  const errorId = `${fieldId}-error`;
  const failed = state.status === "error";
  // React resets the form after each action: refill it with what was typed when saving failed.
  const values = failed ? state.values : { name, slug: slug ?? "" };

  return (
    <form action={formAction} className="flex flex-col gap-2">
      {Object.entries(hiddenFields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-48 flex-1 flex-col gap-1">
          <Label htmlFor={`${fieldId}-name`}>{nameLabel}</Label>
          <Input
            id={`${fieldId}-name`}
            name="name"
            defaultValue={values.name}
            required
            maxLength={NAME_MAX_LENGTH}
            aria-invalid={failed}
            aria-describedby={failed ? errorId : undefined}
          />
        </div>
        {slug !== undefined && (
          <div className="flex min-w-40 flex-col gap-1">
            <Label htmlFor={`${fieldId}-slug`}>Identifiant dans l&apos;adresse</Label>
            <Input
              id={`${fieldId}-slug`}
              name="slug"
              defaultValue={values.slug}
              aria-invalid={failed}
              aria-describedby={failed ? errorId : undefined}
            />
          </div>
        )}
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Enregistrement…" : submitLabel}
        </Button>
      </div>
      {failed && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {state.message}
        </p>
      )}
    </form>
  );
}
