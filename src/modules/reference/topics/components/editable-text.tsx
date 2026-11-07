"use client";

import { cn } from "cn";
import { PencilIcon } from "lucide-react";

type EditableTextProps = {
  label: string;
  className?: string;
  // Gives the focus back to the text once its field was left with the keyboard.
  autoFocus?: boolean;
  ref?: React.Ref<HTMLButtonElement>;
  onEdit: () => void;
  children: React.ReactNode;
};

// One click, tap or key press opens the field: a double-click alone could not be discovered.
export function EditableText({ label, className, autoFocus, ref, onEdit, children }: EditableTextProps) {
  return (
    <button
      ref={ref}
      type="button"
      autoFocus={autoFocus}
      aria-label={label}
      className={cn(
        "group/editable inline-flex min-w-0 touch-manipulation items-center gap-1 rounded px-1 text-left break-words outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50",
        className,
      )}
      onClick={onEdit}
    >
      <span className="min-w-0">{children}</span>
      <PencilIcon
        aria-hidden
        className="size-3 shrink-0 text-muted-foreground opacity-0 group-hover/editable:opacity-100 group-focus-visible/editable:opacity-100"
      />
    </button>
  );
}
