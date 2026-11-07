"use client";

import { cn } from "cn";
import { Fragment, useState } from "react";

import type { ActionResult } from "@/modules/editors/editor-write";

import { editNodeAction, moveNodeAction, removeNodeAction } from "../actions";
import type { Level } from "../topics";
import type { VisibleRow } from "../visible-tree";
import { EditableText } from "./editable-text";
import { type Field, InlineInput } from "./inline-input";
import { RowActions } from "./row-actions";
import { actionsCell, rowGrid, slugCell } from "./row-layout";

type TreeRowProps = {
  level: Level;
  row: VisibleRow;
  // Shown before the name: the expand button of a topic, the branch of a subtopic.
  leading: React.ReactNode;
  // Shown after the name, such as the subtopic count of a topic.
  trailing?: React.ReactNode;
  deletionConfirmation: string;
  editing: Field | null;
  onEditingChange: (field: Field | null) => void;
  canMove: boolean;
  pending: boolean;
  error: string | null;
  onAction: (action: () => Promise<ActionResult>) => void;
};

const labels = {
  topic: { name: "Nom de la thématique" },
  subtopic: { name: "Nom de la sous-thématique" },
};

// A topic or subtopic row: its name and slug, edited in place, and its move and delete buttons.
export function TreeRow({
  level,
  row,
  leading,
  trailing,
  deletionConfirmation,
  editing,
  onEditingChange,
  canMove,
  pending,
  error,
  onAction,
}: TreeRowProps) {
  const node = { level, id: row.id };
  const [refocus, setRefocus] = useState<Field | null>(null);
  const edit = (field: Field) => {
    setRefocus(null);
    onEditingChange(field);
  };
  const stopEditing = (field: Field) => (restoreFocus: boolean) => {
    onEditingChange(null);
    setRefocus(restoreFocus ? field : null);
  };

  return (
    <Fragment>
      <li className={cn(rowGrid, "border-t py-1.5", level === "topic" && "bg-muted/20")}>
        <div className={cn("flex min-w-0 items-center gap-1", level === "subtopic" && "pl-5 md:pl-8")}>
          {leading}
          {editing === "name" ? (
            <InlineInput
              label={`${labels[level].name} « ${row.name} »`}
              initial={row.name}
              onClose={stopEditing("name")}
              onSave={(name) => editNodeAction(node, { name })}
            />
          ) : (
            <EditableText
              label={`Renommer « ${row.name} »`}
              className={level === "topic" ? "font-semibold" : undefined}
              autoFocus={refocus === "name"}
              onEdit={() => edit("name")}
            >
              {row.name}
            </EditableText>
          )}
          {trailing}
        </div>
        <div className={cn(slugCell, "flex min-w-0 pl-9 md:pl-0")}>
          {editing === "slug" ? (
            <InlineInput
              label={`Identifiant de « ${row.name} »`}
              field="slug"
              initial={row.slug}
              onClose={stopEditing("slug")}
              onSave={(slug) => editNodeAction(node, { slug })}
            />
          ) : (
            <EditableText
              label={`Modifier l'identifiant de « ${row.name} »`}
              className="font-mono text-xs text-muted-foreground"
              autoFocus={refocus === "slug"}
              onEdit={() => edit("slug")}
            >
              {row.slug}
            </EditableText>
          )}
        </div>
        <div className={actionsCell}>
          <RowActions
            name={row.name}
            isFirst={row.isFirst}
            isLast={row.isLast}
            disabled={pending}
            canMove={canMove}
            onMove={(direction) => onAction(() => moveNodeAction(node, direction))}
            onDelete={() => {
              if (window.confirm(deletionConfirmation)) onAction(() => removeNodeAction(node));
            }}
          />
        </div>
      </li>
      {error && (
        <li className="px-3 pb-2">
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        </li>
      )}
    </Fragment>
  );
}
