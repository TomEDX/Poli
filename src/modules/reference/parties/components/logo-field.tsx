"use client";

import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldTitle } from "@/components/ui/field";

import { logoFileSchema } from "../validation";
import { logoTypeMessage, logoTypes } from "../vocabulary";
import { PartyLogo } from "./party-logo";

// undefined keeps the saved logo and null removes it; a new file shows from its preview until saved.
export type LogoChoice = { file: File; preview: string } | null | undefined;

type LogoFieldProps = {
  // The id of the choose button, which the form focuses when the logo is refused.
  id: string;
  value: LogoChoice;
  // The saved logo's address, null for a new party or a party without logo.
  savedLogo: string | null;
  // What the placeholder shows while there is no logo.
  party: { name: string; abbreviation: string };
  error: string | undefined;
  onChange: (choice: LogoChoice) => void;
  onError: (message: string | undefined) => void;
};

// The logo is only written with the rest of the sheet; until then the field shows what saving will do.
export function LogoField({ id, value, savedLogo, party, error, onChange, onError }: LogoFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  const shown = value === undefined ? savedLogo : (value?.preview ?? null);

  const choose = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Emptied so that choosing the same file again still counts as a choice.
    event.target.value = "";
    if (!file) return;
    const checked = logoFileSchema.safeParse(file);
    if (!checked.success) return onError(checked.error.issues[0].message);
    const reader = new FileReader();
    reader.onload = () => {
      const preview = reader.result as string;
      // A file that the browser cannot show as an image is refused before it is ever sent.
      const image = new Image();
      image.onload = () => {
        onChange({ file, preview });
        onError(undefined);
      };
      image.onerror = () => onError(logoTypeMessage);
      image.src = preview;
    };
    reader.readAsDataURL(file);
  };

  const remove = () => {
    onChange(savedLogo ? null : undefined);
    onError(undefined);
    // The remove button disappears: the focus stays on the field, whose help now says what saving will do.
    document.getElementById(id)?.focus();
  };

  return (
    <Field data-invalid={error ? true : undefined} aria-labelledby={`${id}-title`}>
      <FieldTitle id={`${id}-title`}>Logo</FieldTitle>
      <div className="flex items-center gap-4">
        <PartyLogo party={{ ...party, logo: shown }} className="size-16" />
        <div className="flex flex-wrap gap-2">
          <Button
            id={id}
            type="button"
            variant="outline"
            aria-describedby={`${id}-help${error ? ` ${id}-error` : ""}`}
            onClick={() => input.current?.click()}
          >
            {shown ? "Remplacer le logo" : "Choisir un logo"}
          </Button>
          {shown && (
            <Button type="button" variant="ghost" onClick={remove}>
              Retirer le logo
            </Button>
          )}
        </div>
      </div>
      <input ref={input} type="file" accept={logoTypes.join(",")} hidden onChange={choose} />
      <FieldDescription id={`${id}-help`}>{logoHelp(value)}</FieldDescription>
      <FieldError id={`${id}-error`}>{error}</FieldError>
    </Field>
  );
}

function logoHelp(logo: LogoChoice) {
  if (logo === null) return "Le logo sera retiré à l’enregistrement.";
  if (logo) return `« ${logo.file.name} » sera enregistré avec le parti.`;
  return "SVG, PNG ou WebP, 1 Mo maximum. Sans logo, le sigle s’affiche à sa place.";
}
