"use client";

import { useId, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createPartyAction } from "../actions";
import { ABBREVIATION_MAX_LENGTH, NAME_MAX_LENGTH } from "../validation";

// A party needs both a name and an abbreviation, so it is created from a small form
// rather than a single inline field.
export function NewPartyForm({ onClose }: { onClose: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const nameId = useId();
  const abbreviationId = useId();

  return (
    <form
      className="flex flex-wrap items-end gap-2"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
      // A form action would reset the fields, so a refused name would have to be typed again.
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(async () => {
          const result = await createPartyAction({ name: data.get("name"), abbreviation: data.get("abbreviation") });
          if (result.ok) onClose();
          else setError(result.message);
        });
      }}
    >
      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <Label htmlFor={nameId}>Nom du parti</Label>
        <Input id={nameId} name="name" autoFocus required maxLength={NAME_MAX_LENGTH} className="h-9 md:h-8" />
      </div>
      <div className="flex w-28 flex-col gap-1">
        <Label htmlFor={abbreviationId}>Sigle</Label>
        <Input
          id={abbreviationId}
          name="abbreviation"
          required
          maxLength={ABBREVIATION_MAX_LENGTH}
          className="h-9 md:h-8"
        />
      </div>
      <div className="flex gap-1">
        <Button type="submit" disabled={pending}>
          Ajouter
        </Button>
        <Button type="button" variant="ghost" onClick={onClose}>
          Annuler
        </Button>
      </div>
      {error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}
