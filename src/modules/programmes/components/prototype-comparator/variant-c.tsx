"use client";

// PROTOTYPE, throwaway. Variant C: a table of contents on the left of a wide screen, the current
// topic opened on its subtopics, which follow the reading; pinned candidacy names over the
// columns. Phone: the icon tabs come back above the names.

import { cn } from "cn";
import Link from "next/link";
import { useEffect, useState } from "react";

import {
  AddCandidacy,
  CandidacyBadge,
  CandidacyChip,
  candidacyOf,
  EmptySubtopic,
  extractCount,
  FirstChoice,
  isEmptySubtopic,
  NothingHere,
  prototypeHref,
  type PrototypeProps,
  Quote,
  topicIcon,
  TopicTabs,
  useComparisonNav,
} from "./shared";

export function VariantC({ candidacies, chosen, grid, selection, variant }: PrototypeProps) {
  const nav = useComparisonNav(selection, variant);
  const topic = grid.find((candidate) => candidate.slug === selection.topic);
  const [reading, setReading] = useState<string | null>(null);
  const columns = { gridTemplateColumns: "repeat(" + chosen.length + ", minmax(0, 1fr))" };

  useEffect(() => {
    // The subtopic being read is the last one whose top went under the pinned names.
    function onScroll() {
      const sections = [...document.querySelectorAll<HTMLElement>("[data-subtopic]")];
      const passed = sections.filter((section) => section.getBoundingClientRect().top < 120);
      setReading((passed.at(-1) ?? sections[0])?.getAttribute("data-subtopic") ?? null);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [selection.topic, chosen.length]);

  if (chosen.length === 0) return <FirstChoice candidacies={candidacies} onAdd={nav.add} />;

  return (
    <div className="grid gap-8 md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden md:block">
        <nav aria-label="Thématiques" className="sticky top-4 flex flex-col gap-0.5">
          <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Thématiques</p>
          {grid.map((candidate) => {
            const current = candidate.slug === selection.topic;
            const Icon = topicIcon(candidate.slug);
            return (
              <div key={candidate.id}>
                <Link
                  href={prototypeHref({ ...selection, topic: candidate.slug }, variant)}
                  scroll={false}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-sm",
                    current
                      ? "border-foreground bg-muted font-medium"
                      : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                  )}
                >
                  <Icon aria-hidden className="size-4 shrink-0" />
                  <span className="flex-1">{candidate.name}</span>
                  <span className="text-xs tabular-nums opacity-70">{extractCount(candidate)}</span>
                </Link>
                {current && (
                  <ul className="my-1 ml-5 flex flex-col border-l">
                    {candidate.subtopics.map((subtopic) => (
                      <li key={subtopic.id}>
                        <a
                          href={"#sub-" + subtopic.id}
                          className={cn(
                            "-ml-px block border-l py-1 pl-3 text-sm",
                            reading === subtopic.id
                              ? "border-foreground text-foreground"
                              : "border-transparent text-muted-foreground hover:text-foreground",
                            isEmptySubtopic(subtopic) && "opacity-50",
                          )}
                        >
                          {subtopic.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-col">
        <div className="sticky top-0 z-20 -mx-4 border-b bg-background/95 backdrop-blur md:mx-0">
          <div className="border-b md:hidden">
            <TopicTabs grid={grid} selection={selection} variant={variant} />
          </div>
          <div className="flex items-center gap-4 px-4 py-2 md:px-0">
            <div className="hidden flex-1 gap-4 md:grid" style={columns}>
              {chosen.map((candidacy) => (
                <CandidacyChip key={candidacy.id} candidacy={candidacy} onRemove={() => nav.remove(candidacy.id)} />
              ))}
            </div>
            <div className="flex flex-1 items-center gap-2 md:hidden">
              {chosen.map((candidacy) => (
                <CandidacyChip
                  key={candidacy.id}
                  compact
                  candidacy={candidacy}
                  onRemove={() => nav.remove(candidacy.id)}
                  className="rounded-full border py-0.5 pr-0.5 pl-1"
                />
              ))}
            </div>
            <AddCandidacy candidacies={candidacies} selection={selection} onAdd={nav.add} />
          </div>
        </div>

        {topic && (
          <section aria-labelledby="compared-topic" className="flex flex-col gap-6 pt-6">
            <h2 id="compared-topic" className="font-heading text-2xl font-semibold tracking-tight">
              {topic.name}
            </h2>
            {topic.subtopics.map((subtopic) => (
              <div key={subtopic.id} id={"sub-" + subtopic.id} data-subtopic={subtopic.id} className="scroll-mt-32">
                {isEmptySubtopic(subtopic) ? (
                  <EmptySubtopic name={subtopic.name} />
                ) : (
                  <section className="flex flex-col gap-3">
                    <h3 className="font-heading text-lg font-semibold">{subtopic.name}</h3>
                    <div className="hidden gap-4 md:grid" style={columns}>
                      {subtopic.cells.map((cell) => (
                        <div key={cell.candidacyId} className="flex flex-col gap-4 rounded-xl bg-muted/40 p-4">
                          {cell.extracts.length === 0 ? (
                            <NothingHere />
                          ) : (
                            cell.extracts.map((extract) => <Quote key={extract.id} extract={extract} />)
                          )}
                        </div>
                      ))}
                    </div>
                    <ul className="flex flex-col gap-4 md:hidden">
                      {subtopic.cells.map((cell) => {
                        const candidacy = candidacyOf(chosen, cell.candidacyId);
                        if (!candidacy) return null;
                        return (
                          <li key={cell.candidacyId} className="flex flex-col gap-2">
                            <CandidacyBadge candidacy={candidacy} />
                            {cell.extracts.length === 0 ? (
                              <NothingHere />
                            ) : (
                              cell.extracts.map((extract) => <Quote key={extract.id} extract={extract} />)
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                )}
              </div>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}
