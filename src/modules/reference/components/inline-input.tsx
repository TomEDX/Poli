"use client";

import { cn } from "cn";
import { useId, useRef, useState, useTransition } from "react";

import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/modules/editors/editor-write";

import { NAME_MAX_LENGTH } from "../validation";

export type Field = "name" | "slug";

type InlineInputProps = {
  label: string;
  initial: string;
  placeholder?: string;
  field?: Field;
  maxLength?: number;
  // Lets the editor save an emptied field, such as a candidate name taken back.
  allowEmpty?: boolean;
  onSave: (value: string) => Promise<ActionResult>;
  onClose: () => void;
};

// Enter or leaving the field saves, Escape cancels. On error the field stays open with the message.
export function InlineInput({
  label,
  initial,
  placeholder,
  field = "name",
  maxLength = field === "name" ? NAME_MAX_LENGTH : undefined,
  allowEmpty = false,
  onSave,
  onClose,
}: InlineInputProps) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Closing removes the field, which can fire one last blur: ignore it.
  const closed = useRef(false);
  const errorId = useId();

  const close = () => {
    closed.current = true;
    onClose();
  };

  const commit = () => {
    if (closed.current || pending) return;
    const trimmed = value.trim();
    if ((trimmed === "" && !allowEmpty) || trimmed === initial) return close();
    startTransition(async () => {
      const result = await onSave(trimmed);
      if (result.ok) close();
      else setError(result.message);
    });
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      <Input
        autoFocus
        aria-label={label}
        // 16px text on phones: smaller text makes iOS zoom in when the field gets focus.
        className={cn("h-9 md:h-7", field === "slug" && "font-mono md:text-xs")}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        enterKeyHint="done"
        autoCapitalize={field === "slug" ? "none" : undefined}
        readOnly={pending}
        aria-busy={pending}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") close();
        }}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
