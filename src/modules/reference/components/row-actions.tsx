"use client";

import { cn } from "cn";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Direction } from "@/lib/direction";

import { iconButton } from "./row-layout";

type RowActionsProps = {
  name: string;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  canMove: boolean;
  onMove: (direction: Direction) => void;
  onDelete: () => void;
};

export function RowActions({ name, isFirst, isLast, disabled, canMove, onMove, onDelete }: RowActionsProps) {
  const moveTitle = (label: string) => (canMove ? label : "Videz la recherche pour réordonner");
  return (
    <div className="flex justify-end gap-0.5">
      <Button
        variant="ghost"
        size="icon-xs"
        className={iconButton}
        aria-label={`Monter « ${name} »`}
        title={moveTitle("Monter")}
        disabled={disabled || !canMove || isFirst}
        onClick={() => onMove("up")}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        className={iconButton}
        aria-label={`Descendre « ${name} »`}
        title={moveTitle("Descendre")}
        disabled={disabled || !canMove || isLast}
        onClick={() => onMove("down")}
      >
        <ArrowDown />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        className={cn(iconButton, "text-muted-foreground hover:text-destructive")}
        aria-label={`Supprimer « ${name} »`}
        title="Supprimer"
        disabled={disabled}
        onClick={onDelete}
      >
        <Trash2 />
      </Button>
    </div>
  );
}
