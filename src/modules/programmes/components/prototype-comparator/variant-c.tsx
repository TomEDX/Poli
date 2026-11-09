"use client";

// PROTOTYPE, throwaway. Variant C: a table of contents on the left of a wide screen, the current
// topic opened on its subtopics, which follow the reading; pinned candidacy names over the
// columns. On a phone, "phone" picks how the topic is chosen:
// C, icon tabs pinned with the names as a legend; the others keep today's cards, each named:
// D, a pinned bar opening a sheet with the table of contents; E, nothing pinned, wrapped topic
// pills on top and the previous and next topics at the bottom; F, a pinned native menu.

import { cn } from "cn";
import { ArrowLeftIcon, ArrowRightIcon, ListTreeIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

import type { ComparisonSelection } from "../../comparison-params";
import type { ComparisonGrid } from "../../queries";
import {
  AddCandidacy,
  CandidacyBadge,
  CandidacyChip,
  NamedCard,
  NameTile,
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
  TopicIcon,
  TopicTabs,
  useComparisonNav,
} from "./shared";

export type PhoneLayout = "C" | "D" | "E" | "F" | "G" | "I";

function scrollToSubtopic(id: string) {
  document.getElementById("sub-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function TopicOutline({
  grid,
  selection,
  variant,
  reading,
  onNavigate,
  onPickTopic,
}: {
  grid: ComparisonGrid;
  selection: ComparisonSelection;
  variant: string;
  reading: string | null;
  onNavigate?: () => void;
  onPickTopic?: (slug: string) => void;
}) {
  return (
    <nav aria-label="Thématiques" className="flex flex-col gap-0.5">
      {grid.map((candidate) => {
        const current = candidate.slug === selection.topic;
        const Icon = topicIcon(candidate.slug);
        return (
          <div key={candidate.id}>
            <Link
              href={prototypeHref({ ...selection, topic: candidate.slug }, variant)}
              scroll={!current}
              onClick={(event) => {
                onNavigate?.();
                if (!onPickTopic) return;
                // Every topic is on the page: jump to it instead of loading another.
                event.preventDefault();
                setTimeout(() => onPickTopic(candidate.slug), onNavigate ? 250 : 0);
              }}
              aria-current={current ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-sm transition-all duration-300 ease-out motion-reduce:transition-none",
                current
                  ? "translate-x-1 border-foreground bg-muted font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Icon
                aria-hidden
                className={cn(
                  "size-4 shrink-0 transition-transform duration-300 motion-reduce:transition-none",
                  current && "scale-125",
                )}
              />
              <span className="flex-1">{candidate.name}</span>
              <span className="text-xs tabular-nums opacity-70">{extractCount(candidate)}</span>
            </Link>
            {/* Every list is there, folded: the current one unfolds and the previous one folds. */}
            <div
              inert={!current}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
                current ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <ul className="my-1 ml-5 flex min-h-0 flex-col overflow-hidden border-l">
                {candidate.subtopics.map((subtopic) => (
                  <li key={subtopic.id}>
                    <a
                      href={"#sub-" + subtopic.id}
                      onClick={(event) => {
                        event.preventDefault();
                        onNavigate?.();
                        // Leaves the sheet time to close before scrolling the page under it.
                        setTimeout(() => scrollToSubtopic(subtopic.id), onNavigate ? 250 : 0);
                      }}
                      className={cn(
                        "-ml-px block border-l py-1.5 pl-3 text-sm",
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
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function TopicSheetBar({
  grid,
  selection,
  variant,
  reading,
  onPickTopic,
  trigger = "bar",
}: {
  grid: ComparisonGrid;
  selection: ComparisonSelection;
  variant: string;
  reading: string | null;
  onPickTopic?: (slug: string) => void;
  trigger?: "bar" | "button";
}) {
  const [open, setOpen] = useState(false);
  const topic = grid.find((candidate) => candidate.slug === selection.topic);
  const subtopic = topic?.subtopics.find((candidate) => candidate.id === reading);
  return (
    <>
      {trigger === "button" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 rounded-full border bg-background px-2.5 py-1 font-sans text-xs font-normal tracking-normal"
        >
          <ListTreeIcon aria-hidden className="size-3.5" />
          Sommaire
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-12 w-full items-center gap-2 px-4 text-left"
          aria-label={"Changer de thématique, actuellement " + (topic?.name ?? "")}
        >
          <TopicIcon slug={selection.topic} className="size-4 shrink-0" />
          <span className="shrink-0 font-medium">{topic?.name}</span>
          {subtopic && <span className="min-w-0 truncate text-sm text-muted-foreground">› {subtopic.name}</span>}
          <span className="ml-auto flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs">
            <ListTreeIcon aria-hidden className="size-3.5" />
            Sommaire
          </span>
        </button>
      )}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-2xl pb-8">
          <SheetHeader>
            <SheetTitle>Thématiques</SheetTitle>
          </SheetHeader>
          <div className="px-2">
            <TopicOutline
              grid={grid}
              selection={selection}
              variant={variant}
              reading={reading}
              onNavigate={() => setOpen(false)}
              onPickTopic={onPickTopic}
            />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function TopicPills({ grid, selection, variant }: { grid: ComparisonGrid; selection: ComparisonSelection; variant: string }) {
  return (
    <nav aria-label="Thématiques">
      <ul className="flex flex-wrap gap-2">
        {grid.map((candidate) => {
          const current = candidate.slug === selection.topic;
          const Icon = topicIcon(candidate.slug);
          return (
            <li key={candidate.id}>
              <Link
                href={prototypeHref({ ...selection, topic: candidate.slug }, variant)}
                scroll={false}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-2 rounded-full border px-4 text-sm",
                  current ? "border-foreground bg-foreground text-background" : "text-foreground",
                )}
              >
                <Icon aria-hidden className="size-4" />
                {candidate.name}
                <span className="text-xs tabular-nums opacity-60">{extractCount(candidate)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function TopicSteps({ grid, selection, variant }: { grid: ComparisonGrid; selection: ComparisonSelection; variant: string }) {
  const index = grid.findIndex((candidate) => candidate.slug === selection.topic);
  const previous = grid[index - 1];
  const next = grid[index + 1];
  return (
    <nav aria-label="Autres thématiques" className="grid grid-cols-2 gap-3 pt-4">
      {previous ? (
        <Link
          href={prototypeHref({ ...selection, topic: previous.slug }, variant)}
          className="flex flex-col gap-1 rounded-xl border p-3"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <ArrowLeftIcon aria-hidden className="size-3.5" />
            Précédente
          </span>
          <span className="text-sm font-medium">{previous.name}</span>
        </Link>
      ) : (
        <span />
      )}
      {next && (
        <Link
          href={prototypeHref({ ...selection, topic: next.slug }, variant)}
          className="flex flex-col items-end gap-1 rounded-xl border p-3 text-right"
        >
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            Suivante
            <ArrowRightIcon aria-hidden className="size-3.5" />
          </span>
          <span className="text-sm font-medium">{next.name}</span>
        </Link>
      )}
    </nav>
  );
}

// One option per subtopic, grouped by topic: the phone's own picker lists them all at once.
function TopicSelect({
  grid,
  selection,
  variant,
  reading,
}: {
  grid: ComparisonGrid;
  selection: ComparisonSelection;
  variant: string;
  reading: string | null;
}) {
  const router = useRouter();
  const topic = grid.find((candidate) => candidate.slug === selection.topic);
  const value = selection.topic + "|" + (reading ?? topic?.subtopics[0]?.id ?? "");
  return (
    <div className="flex items-center gap-2 px-4 py-2">
      <NativeSelect
        aria-label="Aller à une thématique"
        value={value}
        onChange={(event) => {
          const [slug, subtopicId] = event.target.value.split("|");
          if (slug === selection.topic) scrollToSubtopic(subtopicId);
          else router.push(prototypeHref({ ...selection, topic: slug }, variant) + "#sub-" + subtopicId);
        }}
        className="w-full [&_select]:h-10 [&_select]:text-base"
      >
        {grid.map((candidate) => (
          <NativeSelectOptGroup key={candidate.id} label={candidate.name + " (" + extractCount(candidate) + ")"}>
            {candidate.subtopics.map((subtopic) => (
              <NativeSelectOption key={subtopic.id} value={candidate.slug + "|" + subtopic.id}>
                {candidate.name} › {subtopic.name}
              </NativeSelectOption>
            ))}
          </NativeSelectOptGroup>
        ))}
      </NativeSelect>
    </div>
  );
}


export function VariantC({
  candidacies,
  chosen,
  grid,
  selection,
  variant,
  phone = "C",
}: PrototypeProps & { phone?: PhoneLayout }) {
  const nav = useComparisonNav(selection, variant);
  const topic = grid.find((candidate) => candidate.slug === selection.topic);
  const [reading, setReading] = useState<string | null>(null);
  const all = phone === "G" || phone === "I";
  // I pins the titles themselves: the topic under the names, the subtopic under the topic.
  const pinnedTitles = phone === "I";
  const namesRef = useRef<HTMLDivElement>(null);
  const [namesHeight, setNamesHeight] = useState(0);
  const lockUntil = useRef(0);
  const [readingTopic, setReadingTopic] = useState(selection.topic);
  const outlineSelection = all ? { ...selection, topic: readingTopic } : selection;
  const shownTopics = all ? grid : topic ? [topic] : [];
  const pickTopic = all
    ? (slug: string) => {
        // The outline shows the chosen topic at once, not each topic the page scrolls past.
        lockUntil.current = Date.now() + 1500;
        setReadingTopic(slug);
        document.getElementById("topic-" + slug)?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    : undefined;
  const columns = { gridTemplateColumns: "repeat(" + chosen.length + ", minmax(0, 1fr))" };
  const pinnedOnPhone = phone !== "E" && phone !== "I";

  useEffect(() => {
    const names = namesRef.current;
    if (!names) return;
    const observer = new ResizeObserver(() => setNamesHeight(names.offsetHeight));
    observer.observe(names);
    return () => observer.disconnect();
  }, [chosen.length]);
  const topicLine = pinnedTitles ? namesHeight + 60 : 160;
  const subtopicLine = pinnedTitles ? namesHeight + 110 : 120;

  useEffect(() => {
    // The subtopic being read is the last one whose top went under the pinned bar.
    function onScroll() {
      if (Date.now() < lockUntil.current) return;
      const sections = [...document.querySelectorAll<HTMLElement>("[data-subtopic]")];
      const passed = sections.filter((section) => section.getBoundingClientRect().top < subtopicLine);
      const current = passed.at(-1) ?? sections[0];
      setReading(current?.getAttribute("data-subtopic") ?? null);
      // The topic in view is the last one whose title reached the pinned names.
      const topics = [...document.querySelectorAll<HTMLElement>("section[id^=topic-]")];
      const topic = topics.filter((section) => section.getBoundingClientRect().top < topicLine).at(-1) ?? topics[0];
      if (topic) setReadingTopic(topic.id.slice("topic-".length));
    }
    onScroll();
    function onScrollEnd() {
      lockUntil.current = 0;
      onScroll();
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    window.addEventListener("scrollend", onScrollEnd);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("scrollend", onScrollEnd);
    };
  }, [selection.topic, chosen.length, topicLine, subtopicLine]);

  // A shared link opens on its topic; reading on keeps the link pointing at the topic in view.
  useEffect(() => {
    if (!all) return;
    if (new URLSearchParams(window.location.search).has("thematique") && selection.topic !== grid[0]?.slug) {
      document.getElementById("topic-" + selection.topic)?.scrollIntoView({ block: "start" });
    }
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!all) return;
    const url = new URL(window.location.href);
    url.searchParams.set("thematique", readingTopic);
    window.history.replaceState(window.history.state, "", url.pathname + url.search.replaceAll("%2C", ","));
  }, [all, readingTopic]);

  if (chosen.length === 0) return <FirstChoice candidacies={candidacies} onAdd={nav.add} />;

  const phoneChips = (
    <div className="flex flex-wrap items-center gap-2 md:hidden">
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
  );

  return (
    <div className="grid gap-8 md:grid-cols-[12rem_minmax(0,1fr)] lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden md:block">
        <div className="sticky top-4">
          <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Thématiques</p>
          <TopicOutline
            grid={grid}
            selection={outlineSelection}
            variant={variant}
            reading={reading}
            onPickTopic={pickTopic}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {phone !== "C" && (
          <div className="flex flex-col gap-4 pb-4 md:hidden">
            {phoneChips}
            {phone === "E" && <TopicPills grid={grid} selection={selection} variant={variant} />}
          </div>
        )}
        <div
          ref={namesRef}
          className={cn(
            "z-20 -mx-4 bg-background/95 backdrop-blur md:sticky md:top-0 md:mx-0 md:border-b",
            pinnedOnPhone && "sticky top-0 border-b",
          )}
        >
          {phone === "C" && (
            <div className="border-b md:hidden">
              <TopicTabs grid={grid} selection={selection} variant={variant} />
            </div>
          )}
          {(phone === "D" || phone === "G") && (
            <div className="md:hidden">
              <TopicSheetBar
                grid={grid}
                selection={outlineSelection}
                variant={variant}
                reading={reading}
                onPickTopic={pickTopic}
              />
            </div>
          )}
          {phone === "F" && (
            <div className="md:hidden">
              <TopicSelect grid={grid} selection={selection} variant={variant} reading={reading} />
            </div>
          )}
          <div className={cn("items-center gap-4 px-4 py-2 md:flex md:px-0", phone === "C" ? "flex" : "hidden")}>
            <div className="hidden flex-1 gap-4 md:grid" style={columns}>
              {chosen.map((candidacy) => (
                <NameTile key={candidacy.id} candidacy={candidacy} onRemove={() => nav.remove(candidacy.id)} />
              ))}
            </div>
            <div className="flex flex-1 md:hidden">{phone === "C" && phoneChips}</div>
            <AddCandidacy candidacies={candidacies} selection={selection} onAdd={nav.add} className="hidden md:block" />
          </div>
        </div>

        {shownTopics.map((topic) => (
          <section
            key={topic.id}
            id={"topic-" + topic.slug}
            aria-labelledby={"title-" + topic.slug}
            className={cn("flex scroll-mt-14 flex-col gap-6 pt-6 md:scroll-mt-24", all && "pb-6")}
            style={pinnedTitles ? { scrollMarginTop: namesHeight } : undefined}
          >
            <h2
              id={"title-" + topic.slug}
              className={cn(
                "flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight",
                pinnedTitles && "sticky z-10 -mx-4 h-14 bg-background/95 px-4 backdrop-blur md:mx-0 md:px-0",
              )}
              style={pinnedTitles ? { top: namesHeight } : undefined}
            >
              {all && <TopicIcon slug={topic.slug} className="size-6" />}
              {topic.name}
              {pinnedTitles && (
                <span className="ml-auto md:hidden">
                  <TopicSheetBar
                    trigger="button"
                    grid={grid}
                    selection={outlineSelection}
                    variant={variant}
                    reading={reading}
                    onPickTopic={pickTopic}
                  />
                </span>
              )}
            </h2>
            {topic.subtopics.map((subtopic) => (
              <div
                key={subtopic.id}
                id={"sub-" + subtopic.id}
                data-subtopic={subtopic.id}
                data-topic={topic.slug}
                className="scroll-mt-20 md:scroll-mt-32"
                style={pinnedTitles ? { scrollMarginTop: namesHeight + 56 } : undefined}
              >
                {isEmptySubtopic(subtopic) ? (
                  <EmptySubtopic name={subtopic.name} />
                ) : (
                  <section className="flex flex-col gap-3">
                    <h3
                      className={cn(
                        "font-heading text-lg font-semibold",
                        pinnedTitles &&
                          "sticky z-[5] -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur md:mx-0 md:px-0",
                      )}
                      style={pinnedTitles ? { top: namesHeight + 56 } : undefined}
                    >
                      {subtopic.name}
                    </h3>
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
                    <ul className={cn("flex flex-col md:hidden", phone === "C" ? "gap-4" : "gap-3")}>
                      {subtopic.cells.map((cell) => {
                        const candidacy = candidacyOf(chosen, cell.candidacyId);
                        if (!candidacy) return null;
                        const body =
                          cell.extracts.length === 0 ? (
                            <NothingHere />
                          ) : (
                            cell.extracts.map((extract) => <Quote key={extract.id} extract={extract} />)
                          );
                        return phone === "C" ? (
                          <li key={cell.candidacyId} className="flex flex-col gap-2">
                            <CandidacyBadge candidacy={candidacy} />
                            {body}
                          </li>
                        ) : (
                          <NamedCard key={cell.candidacyId} candidacy={candidacy}>
                            {body}
                          </NamedCard>
                        );
                      })}
                    </ul>
                  </section>
                )}
              </div>
            ))}
            {phone === "E" && (
              <div className="md:hidden">
                <TopicSteps grid={grid} selection={selection} variant={variant} />
              </div>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
