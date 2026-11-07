"use client";

import { BookOpen, ChevronRight, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { formatConsultedOn, sourceKindLabels } from "../vocabulary";
import type { Source } from "../queries";
import { SourceSheet } from "./source-sheet";

export function SourceTable({ sources }: { sources: Source[] }) {
  // The sheet keeps the source it shows while it closes; null means a new source.
  const [sheet, setSheet] = useState<{ open: boolean; sourceId: string | null }>({ open: false, sourceId: null });
  const newSourceButton = useRef<HTMLButtonElement>(null);
  const openButtons = useRef(new Map<string, HTMLButtonElement>());
  // Set before a source is deleted: once it is gone, the next row (or the add button) gets
  // the focus, which would otherwise fall back to the top of the page.
  const focusAfterRemoval = useRef<{ removed: string; next: string | null } | null>(null);

  useEffect(() => {
    const pending = focusAfterRemoval.current;
    if (!pending || sources.some((source) => source.id === pending.removed)) return;
    focusAfterRemoval.current = null;
    const target = pending.next ? openButtons.current.get(pending.next) : newSourceButton.current;
    target?.focus();
  }, [sources]);

  const shown = sources.find((source) => source.id === sheet.sourceId) ?? null;
  const open = (sourceId: string | null) => setSheet({ open: true, sourceId });

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">Sources</h1>
          <p className="text-sm text-muted-foreground">Chaque source apparaît sur la page Sources du site dès sa création.</p>
        </div>
        {sources.length > 0 && (
          <Button ref={newSourceButton} onClick={() => open(null)}>
            <Plus data-icon="inline-start" />
            Nouvelle source
          </Button>
        )}
      </div>

      {sources.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BookOpen />
            </EmptyMedia>
            <EmptyTitle>Aucune source</EmptyTitle>
            <EmptyDescription>Ajoutez le programme, le scrutin ou le texte officiel d’où vient une information.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button ref={newSourceButton} onClick={() => open(null)}>
              <Plus data-icon="inline-start" />
              Nouvelle source
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 px-4 text-muted-foreground">Titre</TableHead>
                <TableHead className="hidden h-11 px-4 text-muted-foreground md:table-cell">Organisme</TableHead>
                <TableHead className="hidden h-11 px-4 text-muted-foreground lg:table-cell">Type</TableHead>
                <TableHead className="hidden h-11 px-4 text-muted-foreground md:table-cell">Consultée le</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Ouvrir</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sources.map((source) => (
                <SourceRow
                  key={source.id}
                  source={source}
                  openRef={(button) => {
                    if (button) openButtons.current.set(source.id, button);
                    else openButtons.current.delete(source.id);
                  }}
                  onOpen={() => open(source.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <SourceSheet
        source={shown}
        open={sheet.open}
        onOpenChange={(isOpen) => setSheet((current) => ({ ...current, open: isOpen }))}
        returnFocus={() => (shown ? openButtons.current.get(shown.id) : newSourceButton.current) ?? null}
        onRemovingSource={(removing) => {
          if (!shown || !removing) {
            focusAfterRemoval.current = null;
            return;
          }
          const index = sources.indexOf(shown);
          const next = sources[index + 1] ?? sources[index - 1];
          focusAfterRemoval.current = { removed: shown.id, next: next?.id ?? null };
        }}
      />
    </div>
  );
}

type SourceRowProps = {
  source: Source;
  openRef: React.Ref<HTMLButtonElement>;
  onOpen: () => void;
};

// The whole row opens the source; the button in it is what keyboards and screen readers reach.
function SourceRow({ source, openRef, onOpen }: SourceRowProps) {
  const consultedOn = formatConsultedOn(source.consultedOn);

  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="px-4 py-3.5 whitespace-normal">
        <button
          ref={openRef}
          type="button"
          className="rounded-sm text-left font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          <span className="sr-only">Modifier </span>
          {source.title}
        </button>
        <p className="mt-0.5 text-muted-foreground md:hidden">
          {source.organization} · {consultedOn}
        </p>
      </TableCell>
      <TableCell className="hidden px-4 py-3.5 whitespace-normal md:table-cell">{source.organization}</TableCell>
      <TableCell className="hidden px-4 py-3.5 lg:table-cell">{sourceKindLabels[source.kind]}</TableCell>
      <TableCell className="hidden px-4 py-3.5 tabular-nums md:table-cell">{consultedOn}</TableCell>
      <TableCell className="w-10 pr-4 pl-0">
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
      </TableCell>
    </TableRow>
  );
}
