"use client";

import { ChevronDown, ChevronRight, Plus, Search } from "lucide-react";
import { Fragment, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionResult } from "@/modules/editors/editor-write";

import { createSubtopicAction, createTopicAction } from "../actions";
import type { TopicTree } from "../queries";
import { type VisibleTopic, visibleTree } from "../visible-tree";
import { type Field, InlineInput } from "./inline-input";
import { iconButton, rowGrid } from "../../components/row-layout";
import { TreeRow } from "./tree-row";

type Editing = { id: string; field: Field } | null;

// "topic" while a new topic is typed, or the id of the topic receiving a new subtopic.
type Adding = "topic" | string | null;

export function TopicTreeTable({ tree }: { tree: TopicTree }) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(tree.slice(0, 1).map((topic) => topic.id)));
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Editing>(null);
  const [adding, setAdding] = useState<Adding>(null);
  // Where the focus goes back once a new item's field is left with the keyboard.
  const [refocusAdd, setRefocusAdd] = useState<Adding>(null);
  const newTopicButton = useRef<HTMLButtonElement>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const { searching, topics } = visibleTree(tree, query);
  const isOpen = (id: string) => searching || expanded.has(id);

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const rowProps = (id: string) => ({
    editing: editing?.id === id ? editing.field : null,
    onEditingChange: (field: Field | null) => setEditing(field ? { id, field } : null),
    canMove: !searching,
    pending,
    error: rowError?.id === id ? rowError.message : null,
    onAction: (action: () => Promise<ActionResult>) =>
      startTransition(async () => {
        const result = await action();
        setRowError(result.ok ? null : { id, message: result.message });
      }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">Thématiques</h1>
        <Button ref={newTopicButton} onClick={() => setAdding("topic")}>
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
            className="h-9 pl-8 md:h-8"
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

      <div className="overflow-hidden rounded-xl border text-sm">
        <div aria-hidden className={`${rowGrid} bg-muted/50 py-2 font-medium text-muted-foreground`}>
          <span className="px-1">Nom</span>
          <span className="hidden px-1 md:block">Identifiant dans l&apos;adresse</span>
        </div>
        <ul>
          {topics.length === 0 && adding !== "topic" && (
            <li className="border-t py-10 text-center text-muted-foreground">
              {searching ? "Aucun résultat." : "Aucune thématique pour l'instant."}
            </li>
          )}

          {topics.map((topic) => (
            <Fragment key={topic.id}>
              <TreeRow
                level="topic"
                row={topic}
                leading={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    className={iconButton}
                    aria-label={`${isOpen(topic.id) ? "Replier" : "Déplier"} « ${topic.name} »`}
                    aria-expanded={isOpen(topic.id)}
                    onClick={() => toggle(topic.id)}
                  >
                    {isOpen(topic.id) ? <ChevronDown /> : <ChevronRight />}
                  </Button>
                }
                trailing={
                  <span className="shrink-0 rounded-md bg-secondary px-1.5 text-xs text-secondary-foreground tabular-nums">
                    {topic.subtopicCount}
                  </span>
                }
                deletionConfirmation={topicDeletionConfirmation(topic)}
                {...rowProps(topic.id)}
              />

              {isOpen(topic.id) &&
                topic.subtopics.map((subtopic) => (
                  <TreeRow
                    key={subtopic.id}
                    level="subtopic"
                    row={subtopic}
                    leading={
                      <span aria-hidden className="text-muted-foreground">
                        └
                      </span>
                    }
                    deletionConfirmation={`Supprimer la sous-thématique « ${subtopic.name} » ?`}
                    {...rowProps(subtopic.id)}
                  />
                ))}

              {isOpen(topic.id) && !searching && (
                <li className="border-t py-1.5 pr-2 pl-6 md:pl-10">
                  {adding === topic.id ? (
                    <div className="max-w-sm">
                      <InlineInput
                        label={`Nouvelle sous-thématique de « ${topic.name} »`}
                        placeholder="Nom de la sous-thématique, puis Entrée…"
                        initial=""
                        onClose={(restoreFocus) => {
                          setAdding(null);
                          setRefocusAdd(restoreFocus ? topic.id : null);
                        }}
                        onSave={(name) => createSubtopicAction(topic.id, { name, slug: "" })}
                      />
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-8 text-muted-foreground md:h-6"
                      autoFocus={refocusAdd === topic.id}
                      onClick={() => setAdding(topic.id)}
                    >
                      <Plus /> Ajouter une sous-thématique
                    </Button>
                  )}
                </li>
              )}
            </Fragment>
          ))}

          {adding === "topic" && (
            <li className="border-t bg-muted/20 px-3 py-1.5">
              <div className="max-w-sm">
                <InlineInput
                  label="Nouvelle thématique"
                  placeholder="Nom de la thématique, puis Entrée…"
                  initial=""
                  onClose={(restoreFocus) => {
                    setAdding(null);
                    if (restoreFocus) newTopicButton.current?.focus();
                  }}
                  onSave={(name) => createTopicAction({ name, slug: "" })}
                />
              </div>
            </li>
          )}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">
        Sélectionnez un nom ou un identifiant pour le modifier. Une sous-thématique utilisée par un contenu ne peut pas
        être supprimée.
      </p>
    </div>
  );
}

function topicDeletionConfirmation(topic: VisibleTopic) {
  const count = topic.subtopicCount;
  if (count === 0) return `Supprimer la thématique « ${topic.name} » ?`;
  if (count === 1) return `Supprimer la thématique « ${topic.name} » et sa sous-thématique ?`;
  return `Supprimer la thématique « ${topic.name} » et ses ${count} sous-thématiques ?`;
}
