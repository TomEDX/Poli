"use client";

import { cn } from "cn";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { PublishedCandidacy } from "@/modules/reference/parties/queries";

import { AddCandidacy, CandidacyChip, FirstChoice, NameTile } from "./candidacy-choice";
import { ComparisonOutline } from "./comparison-outline";
import { candidacyColumns, ComparisonSection } from "./comparison-section";
import { type JumpTarget, pinnedNamesAttribute, useReadingPosition } from "./use-reading-position";
import { type ComparisonSelection, comparisonHref, readComparison } from "../comparison-params";
import type { ComparisonGrid } from "../queries";

/**
 * Every topic of the comparison on one page, with an outline to move around: pinned beside the
 * reading on a wide screen, in a sheet from the bottom on a phone. The link follows the topic
 * being read, so sharing it opens the same passage.
 */
export function Comparator({
  candidacies,
  chosen,
  grid,
  selection,
}: {
  candidacies: PublishedCandidacy[];
  chosen: PublishedCandidacy[];
  grid: ComparisonGrid;
  // Its topic is the one the page opens on, "" for the top of the page.
  selection: ComparisonSelection;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const root = useRef<HTMLDivElement>(null);
  const firstTopic = grid[0]?.slug ?? "";
  const { reading, jumpTo, holdPlace } = useReadingPosition({
    root,
    firstTopic,
    openingTopic: selection.topic,
    layoutKey: selection.candidacyIds.join(","),
  });
  const [outlineOpen, setOutlineOpen] = useState(false);
  // Picked in the sheet: the page scrolls once the sheet has closed and let go of the page.
  const pickedInSheet = useRef<JumpTarget | null>(null);
  const comparing = chosen.length > 0 && grid.length > 0;

  // Replaced, not pushed: "Back" leaves the comparator instead of stepping through topics.
  useEffect(() => {
    if (!comparing) return;
    const linked = readComparison(Object.fromEntries(new URLSearchParams(window.location.search)), []).topic;
    if ((linked || firstTopic) === reading.topic) return;
    window.history.replaceState(null, "", comparisonHref({ candidacyIds: selection.candidacyIds, topic: reading.topic }));
  }, [comparing, firstTopic, reading.topic, selection.candidacyIds]);

  function choose(candidacyIds: string[]) {
    const topic = comparing ? reading.topic : selection.topic;
    if (comparing) holdPlace();
    startTransition(() => router.push(comparisonHref({ candidacyIds, topic }), { scroll: false }));
  }
  const add = (id: string) => choose([...selection.candidacyIds, id]);
  const remove = (id: string) => choose(selection.candidacyIds.filter((other) => other !== id));

  if (chosen.length === 0) return <FirstChoice candidacies={candidacies} onAdd={add} />;
  if (grid.length === 0) return <p className="text-muted-foreground">Aucune thématique n’est encore définie.</p>;

  return (
    <>
      {/* Without the browser's scroll anchoring, which would move the page a second time
          after the reading position puts the passage back in place. */}
      <div
        ref={root}
        className="grid gap-8 [overflow-anchor:none] md:grid-cols-[12rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]"
      >
        <aside className="hidden md:block">
          {/* Above the reading column, so the list of candidacies to add opens over the names. */}
          <div className="sticky top-4 z-30 flex max-h-[calc(100dvh-2rem)] flex-col gap-4">
            <AddCandidacy candidacies={candidacies} chosenIds={selection.candidacyIds} onAdd={add} />
            <p className="px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Thématiques</p>
            <div className="min-h-0 overflow-y-auto pr-1">
              <ComparisonOutline
                grid={grid}
                candidacyIds={selection.candidacyIds}
                reading={reading}
                onJump={jumpTo}
              />
            </div>
          </div>
        </aside>

        <div aria-busy={pending} className={cn("flex min-w-0 flex-col transition-opacity", pending && "opacity-60")}>
          <div className="flex flex-wrap items-center gap-2 pb-4 md:hidden">
            {chosen.map((candidacy) => (
              <CandidacyChip key={candidacy.id} candidacy={candidacy} onRemove={() => remove(candidacy.id)} />
            ))}
            <AddCandidacy compact candidacies={candidacies} chosenIds={selection.candidacyIds} onAdd={add} />
          </div>
          <div
            {...{ [pinnedNamesAttribute]: "" }}
            className="sticky top-0 z-20 hidden gap-4 border-b bg-background/95 py-2 backdrop-blur md:grid"
            style={candidacyColumns(chosen.length)}
          >
            {chosen.map((candidacy) => (
              <NameTile key={candidacy.id} candidacy={candidacy} onRemove={() => remove(candidacy.id)} />
            ))}
          </div>
          {grid.map((topic) => (
            <ComparisonSection
              key={topic.id}
              topic={topic}
              candidacies={chosen}
              onOpenOutline={() => setOutlineOpen(true)}
            />
          ))}
        </div>
      </div>

      <Sheet
        open={outlineOpen}
        onOpenChange={setOutlineOpen}
        onOpenChangeComplete={(open) => {
          const target = pickedInSheet.current;
          pickedInSheet.current = null;
          if (!open && target) jumpTo(target);
        }}
      >
        <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-2xl pb-8">
          <SheetHeader>
            <SheetTitle>Sommaire</SheetTitle>
          </SheetHeader>
          <div className="px-2">
            <ComparisonOutline
              grid={grid}
              candidacyIds={selection.candidacyIds}
              reading={reading}
              onJump={(target) => {
                pickedInSheet.current = target;
                setOutlineOpen(false);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
