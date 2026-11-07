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
  onSave: (value: string) => Promise<ActionResult>;
  // restoreFocus is true when the field was left with Enter or Escape, false on a click elsewhere.
  onClose: (restoreFocus: boolean) => void;
};

// Enter or leaving the field saves, Escape cancels. On error the field stays open with the message.
export function InlineInput({ label, initial, placeholder, field = "name", onSave, onClose }: InlineInputProps) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // Closing removes the field, which can fire one last blur: ignore it.
  const closed = useRef(false);
  const errorId = useId();

  const close = (restoreFocus: boolean) => {
    closed.current = true;
    onClose(restoreFocus);
  };

  const commit = (restoreFocus: boolean) => {
    if (closed.current || pending) return;
    const trimmed = value.trim();
    if (trimmed === "" || trimmed === initial) return close(restoreFocus);
    startTransition(async () => {
      const result = await onSave(trimmed);
      if (result.ok) close(restoreFocus);
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
        maxLength={field === "name" ? NAME_MAX_LENGTH : undefined}
        enterKeyHint="done"
        autoCapitalize={field === "slug" ? "none" : undefined}
        readOnly={pending}
        aria-busy={pending}
        aria-invalid={error !== null}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => setValue(event.target.value)}
        onBlur={() => commit(false)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit(true);
          }
          if (event.key === "Escape") close(true);
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
