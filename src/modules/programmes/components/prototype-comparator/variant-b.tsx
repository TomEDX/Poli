"use client";

// PROTOTYPE, throwaway. Variant B: large icon tabs at the top; once scrolled, the pinned bar
// shrinks to one line with the topic in a menu. Phone: one candidacy at a time, swiped
// sideways, every subtopic following the same candidacy.

import { cn } from "cn";
import { useEffect, useRef, useState } from "react";

import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { PartyLogo } from "@/modules/reference/parties/components/party-logo";

import {
  AddCandidacy,
  CandidacyChip,
  EmptySubtopic,
  extractCount,
  FirstChoice,
  isEmptySubtopic,
  NothingHere,
  type PrototypeProps,
  Quote,
  TopicTabs,
  useComparisonNav,
} from "./shared";

export function VariantB({ candidacies, chosen, grid, selection, variant }: PrototypeProps) {
  const nav = useComparisonNav(selection, variant);
  const topic = grid.find((candidate) => candidate.slug === selection.topic);
  const sentinel = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const rows = useRef(new Map<string, HTMLDivElement>());
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const columns = { gridTemplateColumns: "repeat(" + chosen.length + ", minmax(0, 1fr))" };

  useEffect(() => {
    const target = sentinel.current;
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setCompact(!entry.isIntersecting));
    observer.observe(target);
    return () => observer.disconnect();
  }, [chosen.length]);

  function show(index: number, smooth = true) {
    activeRef.current = index;
    setActive(index);
    rows.current.forEach((row) =>
      row.scrollTo({ left: index * row.clientWidth, behavior: smooth ? "smooth" : "instant" }),
    );
  }

  function onRowScroll(row: HTMLDivElement) {
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const index = Math.round(row.scrollLeft / row.clientWidth);
      if (index !== activeRef.current) show(index, false);
    }, 90);
  }

  if (chosen.length === 0) return <FirstChoice candidacies={candidacies} onAdd={nav.add} />;
  const shown = Math.min(active, chosen.length - 1);

  return (
    <div className="flex flex-col">
      <div className="-mx-4 border-b md:-mx-8">
        <TopicTabs grid={grid} selection={selection} variant={variant} size="large" />
      </div>
      <div ref={sentinel} />
      <div className="sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur md:-mx-8 md:px-8">
        {compact && (
          <div className="mb-2 flex items-center gap-2">
            <span className="sr-only">Thématique</span>
            <NativeSelect
              size="sm"
              aria-label="Changer de thématique"
              value={selection.topic}
              onChange={(event) => nav.go({ topic: event.target.value })}
              className="w-full md:w-80"
            >
              {grid.map((candidate) => (
                <NativeSelectOption key={candidate.id} value={candidate.slug}>
                  {candidate.name} ({extractCount(candidate)})
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
        )}
        <div className="hidden items-center gap-4 md:flex">
          <div className="grid flex-1 gap-4" style={columns}>
            {chosen.map((candidacy) => (
              <CandidacyChip
                key={candidacy.id}
                compact={compact}
                candidacy={candidacy}
                onRemove={() => nav.remove(candidacy.id)}
              />
            ))}
          </div>
          <AddCandidacy candidacies={candidacies} selection={selection} onAdd={nav.add} />
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <div role="tablist" aria-label="Candidature affichée" className="flex flex-1 gap-1 rounded-full bg-muted p-1">
            {chosen.map((candidacy, index) => (
              <button
                key={candidacy.id}
                type="button"
                role="tab"
                aria-selected={index === shown}
                onClick={() => show(index)}
                className={cn(
                  "flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1 text-sm",
                  index === shown ? "bg-background font-medium shadow-sm" : "text-muted-foreground",
                )}
              >
                {candidacy.party.logo && (
                  <span aria-hidden>
                    <PartyLogo party={candidacy.party} className="size-5 p-0.5" />
                  </span>
                )}
                <span className="truncate">{candidacy.party.abbreviation}</span>
              </button>
            ))}
          </div>
          <AddCandidacy candidacies={candidacies} selection={selection} onAdd={nav.add} label="" />
        </div>
        <p className="mt-1 truncate text-center text-xs text-muted-foreground md:hidden">
          {chosen[shown]?.label} · glissez pour voir {chosen.length > 1 ? "les autres" : "le programme"}
        </p>
      </div>

      {topic && (
        <section aria-labelledby="compared-topic" className="flex flex-col gap-6 pt-6">
          <h2 id="compared-topic" className="font-heading text-2xl font-semibold tracking-tight">
            {topic.name}
          </h2>
          {topic.subtopics.map((subtopic) =>
            isEmptySubtopic(subtopic) ? (
              <EmptySubtopic key={subtopic.id} name={subtopic.name} />
            ) : (
              <section key={subtopic.id} className="flex flex-col gap-3">
                <h3 className="font-heading text-lg font-semibold">{subtopic.name}</h3>
                <div
                  ref={(row) => {
                    if (row) rows.current.set(subtopic.id, row);
                    else rows.current.delete(subtopic.id);
                  }}
                  onScroll={(event) => onRowScroll(event.currentTarget)}
                  className="flex snap-x snap-mandatory items-start [scrollbar-width:none] overflow-x-auto md:grid md:items-stretch md:gap-4 md:overflow-visible"
                  style={columns}
                >
                  {subtopic.cells.map((cell) => (
                    <div
                      key={cell.candidacyId}
                      className="flex w-full shrink-0 snap-start flex-col gap-4 rounded-xl border bg-card p-3 md:w-auto md:rounded-none md:border-0 md:border-t md:bg-transparent md:px-0"
                    >
                      {cell.extracts.length === 0 ? (
                        <NothingHere />
                      ) : (
                        cell.extracts.map((extract) => <Quote key={extract.id} extract={extract} />)
                      )}
                    </div>
                  ))}
                </div>
              </section>
            ),
          )}
        </section>
      )}
    </div>
  );
}
