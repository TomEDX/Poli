"use client";

import { cn } from "cn";
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, Plus, Search, Trash2 } from "lucide-react";
import { Fragment, useId, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  type ActionResult,
  createSubtopicAction,
  createTopicAction,
  deleteSubtopicAction,
  deleteTopicAction,
  moveSubtopicAction,
  moveTopicAction,
  renameSubtopicAction,
  renameTopicAction,
} from "../actions";
import type { Direction, TopicTree } from "../topics";
import { NAME_MAX_LENGTH, slugify } from "../validation";

type Topic = TopicTree[number];
type Subtopic = Topic["subtopics"][number];
type Field = "name" | "slug";

type InlineInputProps = {
  label: string;
  initial: string;
  placeholder?: string;
  field?: Field;
  onSave: (value: string) => Promise<ActionResult>;
  onClose: () => void;
};

// Enter or leaving the field saves, Escape cancels. On error the field stays open with the message.
function InlineInput({ label, initial, placeholder, field = "name", onSave, onClose }: InlineInputProps) {
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
    if (trimmed === "" || trimmed === initial) return close();
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
        className={cn("h-7", field === "slug" && "font-mono text-xs")}
        value={value}
        placeholder={placeholder}
        maxLength={field === "name" ? NAME_MAX_LENGTH : undefined}
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

type EditableTextProps = {
  label: string;
  className?: string;
  onEdit: () => void;
  children: React.ReactNode;
};

// Double-click with the mouse, Enter or Space with the keyboard.
function EditableText({ label, className, onEdit, children }: EditableTextProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title="Double-cliquez pour modifier"
      className={cn("truncate rounded px-1 text-left hover:bg-muted", className)}
      onDoubleClick={onEdit}
      onClick={(event) => {
        if (event.detail === 0) onEdit();
      }}
    >
      {children}
    </button>
  );
}

type RowActionsProps = {
  name: string;
  isFirst: boolean;
  isLast: boolean;
  disabled: boolean;
  canMove: boolean;
  onMove: (direction: Direction) => void;
  onDelete: () => void;
};

function RowActions({ name, isFirst, isLast, disabled, canMove, onMove, onDelete }: RowActionsProps) {
  return (
    <div className="flex justify-end gap-0.5">
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Monter « ${name} »`}
        title={canMove ? "Monter" : "Videz la recherche pour réordonner"}
        disabled={disabled || !canMove || isFirst}
        onClick={() => onMove("up")}
      >
        <ArrowUp />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        aria-label={`Descendre « ${name} »`}
        title={canMove ? "Descendre" : "Videz la recherche pour réordonner"}
        disabled={disabled || !canMove || isLast}
        onClick={() => onMove("down")}
      >
        <ArrowDown />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        className="text-muted-foreground hover:text-destructive"
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

function topicDeletionConfirmation(topic: Topic) {
  const count = topic.subtopics.length;
  if (count === 0) return `Supprimer la thématique « ${topic.name} » ?`;
  if (count === 1) return `Supprimer la thématique « ${topic.name} » et sa sous-thématique ?`;
  return `Supprimer la thématique « ${topic.name} » et ses ${count} sous-thématiques ?`;
}

export function TopicTreeTable({ tree }: { tree: TopicTree }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(tree.slice(0, 1).map((topic) => topic.id)));
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<{ id: string; field: Field } | null>(null);
  const [adding, setAdding] = useState<"topic" | string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const search = slugify(query);
  const matches = (name: string) => slugify(name).includes(search);
  // A matching topic keeps all its subtopics; otherwise only the matching subtopics show.
  const rows = tree
    .map((topic) => ({
      topic,
      subtopics: !search || matches(topic.name) ? topic.subtopics : topic.subtopics.filter((s) => matches(s.name)),
    }))
    .filter(({ topic, subtopics }) => !search || matches(topic.name) || subtopics.length > 0);
  const isOpen = (id: string) => expanded.has(id) || search !== "";

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const isEditing = (id: string, field: Field) => editing?.id === id && editing.field === field;
  const stopEditing = () => setEditing(null);

  const run = (id: string, action: () => Promise<ActionResult>) =>
    startTransition(async () => {
      const result = await action();
      setRowError(result.ok ? null : { id, message: result.message });
    });

  const deleteRow = (id: string, confirmation: string, action: () => Promise<ActionResult>) => {
    if (window.confirm(confirmation)) run(id, action);
  };

  const errorRow = (id: string) =>
    rowError?.id === id && (
      <tr>
        <td colSpan={3} className="px-3 pb-2">
          <p role="alert" className="text-sm text-destructive">
            {rowError.message}
          </p>
        </td>
      </tr>
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Administration</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Thématiques</h1>
        </div>
        <Button onClick={() => setAdding("topic")}>
          <Plus /> Nouvelle thématique
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            aria-label="Rechercher une thématique ou une sous-thématique"
            placeholder="Rechercher…"
            className="pl-8"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="ml-auto flex gap-1">
          <Button variant="ghost" size="sm" onClick={() => setExpanded(new Set(tree.map((topic) => topic.id)))}>
            Tout déplier
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setExpanded(new Set())}>
            Tout replier
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full table-fixed text-sm">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Nom</th>
              <th className="hidden w-[35%] px-3 py-2 font-medium md:table-cell">Identifiant dans l&apos;adresse</th>
              <th className="w-28 px-3 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && adding !== "topic" && (
              <tr>
                <td colSpan={3} className="py-10 text-center text-muted-foreground">
                  {search ? "Aucun résultat." : "Aucune thématique pour l'instant."}
                </td>
              </tr>
            )}
            {rows.map(({ topic, subtopics }) => {
              const topicIndex = tree.indexOf(topic);
              return (
                <Fragment key={topic.id}>
                  <tr className="border-t bg-muted/20">
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          aria-label={`${isOpen(topic.id) ? "Replier" : "Déplier"} « ${topic.name} »`}
                          aria-expanded={isOpen(topic.id)}
                          onClick={() => toggle(topic.id)}
                        >
                          {isOpen(topic.id) ? <ChevronDown /> : <ChevronRight />}
                        </Button>
                        {isEditing(topic.id, "name") ? (
                          <InlineInput
                            label={`Nom de la thématique « ${topic.name} »`}
                            initial={topic.name}
                            onClose={stopEditing}
                            onSave={(name) => renameTopicAction(topic.id, { name, slug: topic.slug })}
                          />
                        ) : (
                          <EditableText
                            label={`Renommer « ${topic.name} »`}
                            className="font-semibold"
                            onEdit={() => setEditing({ id: topic.id, field: "name" })}
                          >
                            {topic.name}
                          </EditableText>
                        )}
                        <span className="shrink-0 rounded-md bg-secondary px-1.5 text-xs text-secondary-foreground tabular-nums">
                          {topic.subtopics.length}
                        </span>
                      </div>
                    </td>
                    <td className="hidden px-2 py-1.5 md:table-cell">
                      {isEditing(topic.id, "slug") ? (
                        <InlineInput
                          label={`Identifiant de « ${topic.name} »`}
                          field="slug"
                          initial={topic.slug}
                          onClose={stopEditing}
                          onSave={(slug) => renameTopicAction(topic.id, { name: topic.name, slug })}
                        />
                      ) : (
                        <EditableText
                          label={`Modifier l'identifiant de « ${topic.name} »`}
                          className="max-w-full font-mono text-xs text-muted-foreground"
                          onEdit={() => setEditing({ id: topic.id, field: "slug" })}
                        >
                          {topic.slug}
                        </EditableText>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <RowActions
                        name={topic.name}
                        isFirst={topicIndex === 0}
                        isLast={topicIndex === tree.length - 1}
                        disabled={pending}
                        canMove={!search}
                        onMove={(direction) => run(topic.id, () => moveTopicAction(topic.id, direction))}
                        onDelete={() =>
                          deleteRow(topic.id, topicDeletionConfirmation(topic), () => deleteTopicAction(topic.id))
                        }
                      />
                    </td>
                  </tr>
                  {errorRow(topic.id)}

                  {isOpen(topic.id) &&
                    subtopics.map((subtopic: Subtopic) => {
                      const subtopicIndex = topic.subtopics.indexOf(subtopic);
                      return (
                        <Fragment key={subtopic.id}>
                          <tr className="border-t">
                            <td className="py-1.5 pr-2 pl-10">
                              <div className="flex items-center gap-1">
                                <span aria-hidden className="text-muted-foreground">
                                  └
                                </span>
                                {isEditing(subtopic.id, "name") ? (
                                  <InlineInput
                                    label={`Nom de la sous-thématique « ${subtopic.name} »`}
                                    initial={subtopic.name}
                                    onClose={stopEditing}
                                    onSave={(name) => renameSubtopicAction(subtopic.id, { name, slug: subtopic.slug })}
                                  />
                                ) : (
                                  <EditableText
                                    label={`Renommer « ${subtopic.name} »`}
                                    onEdit={() => setEditing({ id: subtopic.id, field: "name" })}
                                  >
                                    {subtopic.name}
                                  </EditableText>
                                )}
                              </div>
                            </td>
                            <td className="hidden px-2 py-1.5 md:table-cell">
                              {isEditing(subtopic.id, "slug") ? (
                                <InlineInput
                                  label={`Identifiant de « ${subtopic.name} »`}
                                  field="slug"
                                  initial={subtopic.slug}
                                  onClose={stopEditing}
                                  onSave={(slug) => renameSubtopicAction(subtopic.id, { name: subtopic.name, slug })}
                                />
                              ) : (
                                <EditableText
                                  label={`Modifier l'identifiant de « ${subtopic.name} »`}
                                  className="max-w-full font-mono text-xs text-muted-foreground"
                                  onEdit={() => setEditing({ id: subtopic.id, field: "slug" })}
                                >
                                  {subtopic.slug}
                                </EditableText>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <RowActions
                                name={subtopic.name}
                                isFirst={subtopicIndex === 0}
                                isLast={subtopicIndex === topic.subtopics.length - 1}
                                disabled={pending}
                                canMove={!search}
                                onMove={(direction) =>
                                  run(subtopic.id, () => moveSubtopicAction(subtopic.id, direction))
                                }
                                onDelete={() =>
                                  deleteRow(
                                    subtopic.id,
                                    `Supprimer la sous-thématique « ${subtopic.name} » ?`,
                                    () => deleteSubtopicAction(subtopic.id),
                                  )
                                }
                              />
                            </td>
                          </tr>
                          {errorRow(subtopic.id)}
                        </Fragment>
                      );
                    })}

                  {isOpen(topic.id) && !search && (
                    <tr className="border-t">
                      <td colSpan={3} className="py-1.5 pr-2 pl-10">
                        {adding === topic.id ? (
                          <div className="max-w-sm">
                            <InlineInput
                              label={`Nouvelle sous-thématique de « ${topic.name} »`}
                              placeholder="Nom de la sous-thématique, puis Entrée"
                              initial=""
                              onClose={() => setAdding(null)}
                              onSave={(name) => createSubtopicAction(topic.id, { name, slug: "" })}
                            />
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="xs"
                            className="text-muted-foreground"
                            onClick={() => setAdding(topic.id)}
                          >
                            <Plus /> Ajouter une sous-thématique
                          </Button>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}

            {adding === "topic" && (
              <tr className="border-t bg-muted/20">
                <td colSpan={3} className="px-3 py-1.5">
                  <div className="max-w-sm">
                    <InlineInput
                      label="Nouvelle thématique"
                      placeholder="Nom de la thématique, puis Entrée"
                      initial=""
                      onClose={() => setAdding(null)}
                      onSave={(name) => createTopicAction({ name, slug: "" })}
                    />
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Double-cliquez sur un nom ou un identifiant pour le modifier : Entrée enregistre, Échap annule. Une
        sous-thématique utilisée par un contenu ne peut pas être supprimée.
      </p>
    </div>
  );
}
