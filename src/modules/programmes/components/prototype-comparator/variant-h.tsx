"use client";

// PROTOTYPE, throwaway. Variant H: every topic on one page, read straight through. A pinned menu
// follows the reading: topics on the first row, the subtopics of the current topic on the
// second; touching an item jumps to it. On a wide screen the chosen candidacies sit above both
// rows, over their columns. On a phone each card keeps its candidacy's name.

import { cn } from "cn";
import { type ReactNode, useEffect, useRef, useState } from "react";

import {
  AddCandidacy,
  CandidacyChip,
  candidacyOf,
  EmptySubtopic,
  FirstChoice,
  isEmptySubtopic,
  NameTile,
  NamedCard,
  NothingHere,
  type PrototypeProps,
  Quote,
  TopicIcon,
  useComparisonNav,
} from "./shared";

type MenuItem = { key: string; label: string; icon?: ReactNode; dim?: boolean };

// Scrolls the page frame by frame: the browser's own smooth scroll gets cancelled when the menu
// rows move under it.
function glideTo(top: number, onDone: () => void) {
  const start = window.scrollY;
  const distance = top - start;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const duration = reduce ? 0 : Math.min(700, 250 + Math.abs(distance) / 10);
  const startedAt = performance.now();
  function step(now: number) {
    const progress = duration === 0 ? 1 : Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    window.scrollTo({ top: start + distance * eased, behavior: "instant" });
    if (progress < 1) requestAnimationFrame(step);
    else onDone();
  }
  requestAnimationFrame(step);
}

// A row of the pinned menu; it scrolls sideways by itself so the current item is always whole.
function MenuRow({
  label,
  items,
  current,
  onPick,
  size,
}: {
  label: string;
  items: MenuItem[];
  current: string;
  onPick: (key: string) => void;
  size: "topic" | "subtopic";
}) {
  const rowRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const row = rowRef.current;
    const item = row?.querySelector<HTMLElement>("[aria-current=true]");
    if (!row || !item) return;
    const left = item.offsetLeft - 16;
    const right = item.offsetLeft + item.offsetWidth + 16 - row.clientWidth;
    // Instant: a smooth scroll here would cancel the page's own smooth scroll in Chrome.
    if (row.scrollLeft > left) row.scrollLeft = left;
    else if (row.scrollLeft < right) row.scrollLeft = right;
  }, [current]);

  return (
    <nav aria-label={label}>
      <ul
        ref={rowRef}
        className="flex [scrollbar-width:none] overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_16px,black_calc(100%-32px),transparent)] px-2 md:px-0"
      >
        {items.map((item) => {
          const active = item.key === current;
          return (
            <li key={item.key} className="shrink-0">
              <button
                type="button"
                aria-current={active}
                onClick={() => onPick(item.key)}
                className={cn(
                  "flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors duration-200",
                  size === "topic" ? "h-12 px-3 text-[0.95rem]" : "h-10 px-3 text-sm",
                  active
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                  item.dim && !active && "text-muted-foreground/50",
                )}
              >
                {item.icon}
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function VariantH({ candidacies, chosen, grid, selection, variant }: PrototypeProps) {
  const nav = useComparisonNav(selection, variant);
  const barRef = useRef<HTMLDivElement>(null);
  const lockUntil = useRef(0);
  const [barHeight, setBarHeight] = useState(100);
  const [readingTopic, setReadingTopic] = useState(selection.topic);
  const [reading, setReading] = useState<string | null>(null);
  const columns = { gridTemplateColumns: "repeat(" + chosen.length + ", minmax(0, 1fr))" };
  const topic = grid.find((candidate) => candidate.slug === readingTopic) ?? grid[0];

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;
    const observer = new ResizeObserver(() => setBarHeight(bar.offsetHeight));
    observer.observe(bar);
    return () => observer.disconnect();
  }, [chosen.length]);

  useEffect(() => {
    // What is read is the last title that reached the bottom of the pinned menu.
    function onScroll() {
      if (Date.now() < lockUntil.current) return;
      const line = (barRef.current?.getBoundingClientRect().bottom ?? 0) + 24;
      const last = (selector: string) => {
        const all = [...document.querySelectorAll<HTMLElement>(selector)];
        return all.filter((element) => element.getBoundingClientRect().top < line).at(-1) ?? all[0];
      };
      const topicSection = last("section[data-topic]");
      if (topicSection) setReadingTopic(topicSection.dataset.topic ?? "");
      const subtopicSection = last("[data-subtopic]");
      if (subtopicSection) setReading(subtopicSection.dataset.subtopic ?? null);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [chosen.length]);

  // A shared link opens on its topic; reading on keeps the link pointing at the topic in view.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("thematique") && selection.topic !== grid[0]?.slug) {
      document.getElementById("topic-" + selection.topic)?.scrollIntoView({ block: "start" });
    }
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("thematique", readingTopic);
    window.history.replaceState(window.history.state, "", url.pathname + url.search.replaceAll("%2C", ","));
  }, [readingTopic]);

  function jump(id: string, topicSlug: string, subtopicId: string | null) {
    // The menu shows the target at once, not each title the page scrolls past.
    lockUntil.current = Number.POSITIVE_INFINITY;
    setReadingTopic(topicSlug);
    setReading(subtopicId);
    const target = document.getElementById(id);
    if (!target) return;
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    glideTo(target.getBoundingClientRect().top + window.scrollY - margin, () => {
      lockUntil.current = 0;
    });
  }

  if (chosen.length === 0) return <FirstChoice candidacies={candidacies} onAdd={nav.add} />;

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center gap-2 pb-4 md:hidden">
        {chosen.map((candidacy) => (
          <CandidacyChip
            key={candidacy.id}
            compact
            candidacy={candidacy}
            onRemove={() => nav.remove(candidacy.id)}
            className="rounded-full border py-0.5 pr-0.5 pl-1"
          />
        ))}
        <AddCandidacy candidacies={candidacies} selection={selection} onAdd={nav.add} label="" />
      </div>

      <div
        ref={barRef}
        className="sticky top-0 z-20 -mx-4 border-b bg-background/95 backdrop-blur md:-mx-8 md:px-8"
      >
        <div className="hidden items-center gap-4 pt-3 pb-2 md:flex">
          <div className="grid flex-1 gap-4" style={columns}>
            {chosen.map((candidacy) => (
              <NameTile key={candidacy.id} candidacy={candidacy} onRemove={() => nav.remove(candidacy.id)} />
            ))}
          </div>
          <AddCandidacy candidacies={candidacies} selection={selection} onAdd={nav.add} />
        </div>
        <MenuRow
          label="Thématiques"
          size="topic"
          current={readingTopic}
          onPick={(slug) => jump("topic-" + slug, slug, null)}
          items={grid.map((candidate) => ({
            key: candidate.slug,
            label: candidate.name,
            icon: <TopicIcon slug={candidate.slug} className="size-4" />,
          }))}
        />
        {topic && (
          <div className="border-t bg-muted/40 md:-mx-8 md:px-8">
            <MenuRow
              label={"Sous-thématiques de " + topic.name}
              size="subtopic"
              current={reading ?? ""}
              onPick={(id) => jump("sub-" + id, topic.slug, id)}
              items={topic.subtopics.map((subtopic) => ({
                key: subtopic.id,
                label: subtopic.name,
                dim: isEmptySubtopic(subtopic),
              }))}
            />
          </div>
        )}
      </div>

      {grid.map((candidate) => (
        <section
          key={candidate.id}
          id={"topic-" + candidate.slug}
          data-topic={candidate.slug}
          aria-labelledby={"title-" + candidate.slug}
          style={{ scrollMarginTop: barHeight - 12 }}
          className="flex flex-col gap-6 pt-8 pb-4"
        >
          <h2 id={"title-" + candidate.slug} className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
            <TopicIcon slug={candidate.slug} className="size-6" />
            {candidate.name}
          </h2>
          {candidate.subtopics.map((subtopic) => (
            <div
              key={subtopic.id}
              id={"sub-" + subtopic.id}
              data-subtopic={subtopic.id}
              style={{ scrollMarginTop: barHeight + 12 }}
            >
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
                  <ul className="flex flex-col gap-3 md:hidden">
                    {subtopic.cells.map((cell) => {
                      const candidacy = candidacyOf(chosen, cell.candidacyId);
                      if (!candidacy) return null;
                      return (
                        <NamedCard key={cell.candidacyId} candidacy={candidacy}>
                          {cell.extracts.length === 0 ? (
                            <NothingHere />
                          ) : (
                            cell.extracts.map((extract) => <Quote key={extract.id} extract={extract} />)
                          )}
                        </NamedCard>
                      );
                    })}
                  </ul>
                </section>
              )}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
