"use client";

import { useId, useState } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

import type { Source } from "../sources";

type SourcePickerProps = {
  // Every source, in the order of the Sources page.
  sources: Source[];
  selected: ReadonlySet<string>;
  onChange: (selected: Set<string>) => void;
  // Says what the content is, for instance "le texte".
  content: string;
};

// Above this count, a filter helps find a source in the list.
const FILTER_THRESHOLD = 6;

/**
 * Checkboxes to link a content to sources of the reference, none required. A checked source
 * stays in view whatever the filter, so the editor always sees what is linked.
 */
export function SourcePicker({ sources, selected, onChange, content }: SourcePickerProps) {
  const [filter, setFilter] = useState("");
  const filterId = useId();
  const listId = useId();
  const needle = normalize(filter.trim());
  const shown = sources.filter(
    (source) => !needle || selected.has(source.id) || normalize(`${source.title} ${source.organization}`).includes(needle),
  );

  const toggle = (id: string, checked: boolean) => {
    const next = new Set(selected);
    if (checked) next.add(id);
    else next.delete(id);
    onChange(next);
  };

  return (
    <FieldSet>
      <FieldLegend>Sources (facultatif)</FieldLegend>
      <FieldDescription>
        Les documents d’où vient l’information sur {content}. Ils se gèrent dans Sources.
      </FieldDescription>
      {sources.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune source : créez-en dans Sources pour les relier ici.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sources.length > FILTER_THRESHOLD && (
            <Field>
              <FieldLabel htmlFor={filterId} className="sr-only">
                Filtrer les sources
              </FieldLabel>
              <Input
                id={filterId}
                type="search"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                autoComplete="off"
                placeholder="Filtrer par titre ou organisme…"
                aria-controls={listId}
              />
            </Field>
          )}
          <FieldGroup id={listId} className="max-h-72 gap-3 overflow-y-auto rounded-lg border p-3">
            {shown.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune source ne correspond.</p>
            ) : (
              shown.map((source) => {
                const id = `${listId}-${source.id}`;
                return (
                  <Field key={source.id} orientation="horizontal">
                    <Checkbox
                      id={id}
                      checked={selected.has(source.id)}
                      onCheckedChange={(checked) => toggle(source.id, checked)}
                    />
                    <FieldLabel htmlFor={id} className="flex flex-col items-start gap-0.5 font-normal">
                      <span>{source.title}</span>
                      <span className="text-xs text-muted-foreground">{source.organization}</span>
                    </FieldLabel>
                  </Field>
                );
              })
            )}
          </FieldGroup>
        </div>
      )}
    </FieldSet>
  );
}

// Case and accents aside, so that "assemblee" finds "Assemblée".
function normalize(value: string): string {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}
