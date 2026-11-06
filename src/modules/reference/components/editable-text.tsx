"use client";

import { cn } from "cn";

type EditableTextProps = {
  label: string;
  className?: string;
  onEdit: () => void;
  children: React.ReactNode;
};

// Double-click with a mouse; a single tap on touch screens, which have no double-click;
// Enter or Space from the keyboard.
export function EditableText({ label, className, onEdit, children }: EditableTextProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title="Double-cliquez pour modifier"
      className={cn("min-w-0 touch-manipulation rounded px-1 text-left break-words hover:bg-muted", className)}
      onDoubleClick={onEdit}
      onClick={(event) => {
        const pointerType = (event.nativeEvent as PointerEvent).pointerType;
        if (event.detail === 0 || pointerType === "touch" || pointerType === "pen") onEdit();
      }}
    >
      {children}
    </button>
  );
}
