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
import { useEffect, useState } from "react";

import { NativeSelect, NativeSelectOptGroup, NativeSelectOption } from "@/components/ui/native-select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { PartyLogo } from "@/modules/reference/parties/components/party-logo";
import type { PublishedCandidacy } from "@/modules/reference/parties/queries";

import type { ComparisonSelection } from "../../comparison-params";
import type { ComparisonGrid } from "../../queries";
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
  TopicIcon,
  TopicTabs,
  useComparisonNav,
} from "./shared";

export type PhoneLayout = "C" | "D" | "E" | "F";

function scrollToSubtopic(id: string) {
  document.getElementById("sub-" + id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function TopicOutline({
  grid,
  selection,
  variant,
  reading,
  onNavigate,
}: {
  grid: ComparisonGrid;
  selection: ComparisonSelection;
  variant: string;
  reading: string | null;
  onNavigate?: () => void;
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
              onClick={onNavigate}
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
            )}
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
}: {
  grid: ComparisonGrid;
  selection: ComparisonSelection;
  variant: string;
  reading: string | null;
}) {
  const [open, setOpen] = useState(false);
  const topic = grid.find((candidate) => candidate.slug === selection.topic);
  const subtopic = topic?.subtopics.find((candidate) => candidate.id === reading);
  return (
    <>
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

function NamedCard({ candidacy, children }: { candidacy: PublishedCandidacy; children: React.ReactNode }) {
  return (
    <li className="flex flex-col gap-4 rounded-xl border bg-card p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <span aria-hidden>
          <PartyLogo party={candidacy.party} className="size-8" />
        </span>
        {candidacy.label}
      </p>
      {children}
    </li>
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
  const columns = { gridTemplateColumns: "repeat(" + chosen.length + ", minmax(0, 1fr))" };
  const pinnedOnPhone = phone !== "E";

  useEffect(() => {
    // The subtopic being read is the last one whose top went under the pinned bar.
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
    <div className="grid gap-8 md:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="hidden md:block">
        <div className="sticky top-4">
          <p className="mb-2 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">Thématiques</p>
          <TopicOutline grid={grid} selection={selection} variant={variant} reading={reading} />
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
          {phone === "D" && (
            <div className="md:hidden">
              <TopicSheetBar grid={grid} selection={selection} variant={variant} reading={reading} />
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
                <CandidacyChip key={candidacy.id} candidacy={candidacy} onRemove={() => nav.remove(candidacy.id)} />
              ))}
            </div>
            <div className="flex flex-1 md:hidden">{phone === "C" && phoneChips}</div>
            <AddCandidacy candidacies={candidacies} selection={selection} onAdd={nav.add} className="hidden md:block" />
          </div>
        </div>

        {topic && (
          <section aria-labelledby="compared-topic" className="flex flex-col gap-6 pt-6">
            <h2 id="compared-topic" className="flex items-center gap-2 font-heading text-2xl font-semibold tracking-tight">
              {topic.name}
            </h2>
            {topic.subtopics.map((subtopic) => (
              <div key={subtopic.id} id={"sub-" + subtopic.id} data-subtopic={subtopic.id} className="scroll-mt-20 md:scroll-mt-32">
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
        )}
      </div>
    </div>
  );
}
