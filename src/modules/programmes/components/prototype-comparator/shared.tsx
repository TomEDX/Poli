"use client";

// PROTOTYPE, throwaway: pieces shared by the comparator variants (see page.tsx). Not for main.

import { cn } from "cn";
import {
  BriefcaseIcon,
  GlobeIcon,
  GraduationCapIcon,
  HeartHandshakeIcon,
  LandmarkIcon,
  LeafIcon,
  type LucideIcon,
  PlusIcon,
  ScaleIcon,
  SignpostIcon,
  StethoscopeIcon,
  TagIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createElement, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";

import { shuffled } from "@/lib/shuffle";
import { PartyLogo } from "@/modules/reference/parties/components/party-logo";
import type { PublishedCandidacy } from "@/modules/reference/parties/queries";
import { SourceLinks } from "@/modules/reference/sources/components/source-links";

import { type ComparisonSelection, comparisonHref } from "../../comparison-params";
import type { ComparedExtract, ComparisonGrid } from "../../queries";
import { formatRecordedOn, MAX_COMPARED_CANDIDACIES } from "../../vocabulary";

export type PrototypeProps = {
  candidacies: PublishedCandidacy[];
  chosen: PublishedCandidacy[];
  grid: ComparisonGrid;
  selection: ComparisonSelection;
  variant: string;
};

export type Topic = ComparisonGrid[number];
export type Subtopic = Topic["subtopics"][number];

const topicIcons: Record<string, LucideIcon> = {
  "economie-et-emploi": BriefcaseIcon,
  "protection-sociale": HeartHandshakeIcon,
  sante: StethoscopeIcon,
  education: GraduationCapIcon,
  "ecologie-et-energie": LeafIcon,
  "securite-et-justice": ScaleIcon,
  immigration: SignpostIcon,
  "institutions-et-democratie": LandmarkIcon,
  "europe-et-international": GlobeIcon,
};

export function topicIcon(slug: string): LucideIcon {
  return topicIcons[slug] ?? TagIcon;
}

export function TopicIcon({ slug, className }: { slug: string; className?: string }) {
  return createElement(topicIcon(slug), { "aria-hidden": true, className });
}

export function prototypeHref(selection: ComparisonSelection, variant: string): string {
  const href = comparisonHref(selection);
  return href + (href.includes("?") ? "&" : "?") + "variant=" + variant;
}

export function useComparisonNav(selection: ComparisonSelection, variant: string) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function go(next: Partial<ComparisonSelection>) {
    startTransition(() => router.push(prototypeHref({ ...selection, ...next }, variant), { scroll: false }));
  }
  return {
    pending,
    go,
    add: (id: string) => go({ candidacyIds: [...selection.candidacyIds, id] }),
    remove: (id: string) => go({ candidacyIds: selection.candidacyIds.filter((other) => other !== id) }),
  };
}

export function extractCount(topic: Topic): number {
  return topic.subtopics.reduce(
    (total, subtopic) => total + subtopic.cells.reduce((sum, cell) => sum + cell.extracts.length, 0),
    0,
  );
}

export function isEmptySubtopic(subtopic: Subtopic): boolean {
  return subtopic.cells.every((cell) => cell.extracts.length === 0);
}

export function candidacyOf(candidacies: PublishedCandidacy[], id: string) {
  return candidacies.find((candidacy) => candidacy.id === id);
}

/** Tabs with icons, scrolled horizontally when they do not fit; the current one stays in view. */
export function TopicTabs({
  grid,
  selection,
  variant,
  size = "default",
}: {
  grid: ComparisonGrid;
  selection: ComparisonSelection;
  variant: string;
  size?: "default" | "large";
}) {
  const listRef = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const current = listRef.current?.querySelector<HTMLElement>("[aria-current=page]");
    const list = listRef.current;
    if (current && list) {
      list.scrollTo({ left: current.offsetLeft - list.clientWidth / 2 + current.clientWidth / 2, behavior: "smooth" });
    }
  }, [selection.topic]);

  return (
    <nav aria-label="Thématiques">
      <ul
        ref={listRef}
        className="flex [scrollbar-width:none] overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_20px,black_calc(100%-20px),transparent)] px-3"
      >
        {grid.map((topic) => {
          const current = topic.slug === selection.topic;
          const Icon = topicIcon(topic.slug);
          const count = extractCount(topic);
          return (
            <li key={topic.id} className="shrink-0">
              <Link
                href={prototypeHref({ ...selection, topic: topic.slug }, variant)}
                scroll={false}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 border-b-2 px-3 whitespace-nowrap transition-colors",
                  size === "large" ? "h-14 text-base" : "h-11 text-sm",
                  current
                    ? "border-foreground font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon aria-hidden className="size-4" />
                {topic.name}
                {selection.candidacyIds.length > 0 && (
                  <span
                    className={cn(
                      "rounded-full px-1.5 text-xs tabular-nums",
                      count === 0 ? "text-muted-foreground/60" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** A chosen candidacy, with a button to take it out of the comparison. */
export function CandidacyChip({
  candidacy,
  onRemove,
  compact = false,
  className,
}: {
  candidacy: PublishedCandidacy;
  onRemove: () => void;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      {(!compact || candidacy.party.logo) && (
        <span aria-hidden>
          <PartyLogo party={candidacy.party} className={compact ? "size-7" : "size-8"} />
        </span>
      )}
      <span className={cn("min-w-0 truncate font-medium", compact ? "pl-2 text-sm" : "text-sm md:text-base")}>
        {compact ? candidacy.party.abbreviation : candidacy.label}
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={"Retirer " + candidacy.label}
        className="ml-auto flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <XIcon aria-hidden className="size-4" />
      </button>
    </div>
  );
}

/** A candidacy's quotes on a phone, under its logo and full name, as the comparator shows them today. */
export function NamedCard({ candidacy, children }: { candidacy: PublishedCandidacy; children: React.ReactNode }) {
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

/** A chosen candidacy at the head of its column: the candidate first, the party under it. */
export function NameTile({ candidacy, onRemove }: { candidacy: PublishedCandidacy; onRemove: () => void }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-foreground/15 bg-muted px-3 py-2.5 text-foreground shadow-sm">
      <span aria-hidden className="hidden shrink-0 lg:block">
        <PartyLogo party={candidacy.party} className="size-10" />
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="line-clamp-2 text-sm leading-tight font-semibold lg:text-base">
          {candidacy.candidateName ?? candidacy.party.name}
        </span>
        <span className="line-clamp-2 text-xs text-muted-foreground">
          {candidacy.candidateName ? candidacy.party.name : "Candidature du parti"}
        </span>
      </span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={"Retirer " + candidacy.label}
        className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
      >
        <XIcon aria-hidden className="size-4" />
      </button>
    </div>
  );
}

/** A small marker that names a candidacy next to its quote on a phone. */
export function CandidacyBadge({ candidacy }: { candidacy: PublishedCandidacy }) {
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full border bg-muted/50 px-2.5 py-0.5 text-xs font-medium">
      {candidacy.party.logo && (
        <span aria-hidden className="-ml-2">
          <PartyLogo party={candidacy.party} className="size-5 rounded-full p-0.5" />
        </span>
      )}
      {candidacy.party.abbreviation}
      <span className="sr-only"> : {candidacy.label}</span>
    </span>
  );
}

const drawnOrders = new Map<string, string[]>();

function subscribeToNothing() {
  return () => {};
}

function drawnOrder(ids: string): string[] {
  let order = drawnOrders.get(ids);
  if (!order) {
    order = shuffled(ids.split(","));
    drawnOrders.set(ids, order);
  }
  return order;
}

// Drawn in the browser, once per visit, so no place favours a candidacy.
export function useDrawnOrder(candidacies: PublishedCandidacy[]): PublishedCandidacy[] {
  const ids = candidacies.map((candidacy) => candidacy.id).join(",");
  const order = useSyncExternalStore(
    subscribeToNothing,
    () => drawnOrder(ids),
    () => null,
  );
  return (order ?? []).flatMap((id) => candidacies.filter((candidacy) => candidacy.id === id));
}

/** "+" that opens the candidacies not yet chosen; hidden once three are chosen. */
export function AddCandidacy({
  candidacies,
  selection,
  onAdd,
  label = "Ajouter",
  className,
}: {
  candidacies: PublishedCandidacy[];
  selection: ComparisonSelection;
  onAdd: (id: string) => void;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const order = useDrawnOrder(candidacies).filter((candidacy) => !selection.candidacyIds.includes(candidacy.id));
  if (selection.candidacyIds.length >= MAX_COMPARED_CANDIDACIES || order.length === 0) return null;
  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex h-9 items-center gap-1.5 rounded-full border border-dashed px-3 text-sm text-muted-foreground hover:border-foreground hover:text-foreground"
      >
        <PlusIcon aria-hidden className="size-4" />
        {label}
      </button>
      {open && (
        <ul className="absolute right-0 z-30 mt-2 flex w-72 flex-col gap-1 rounded-xl border bg-popover p-1.5 shadow-lg">
          {order.map((candidacy) => (
            <li key={candidacy.id}>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  onAdd(candidacy.id);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span aria-hidden>
                  <PartyLogo party={candidacy.party} className="size-7" />
                </span>
                {candidacy.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Shown in place of the comparison until a first candidacy is chosen. */
export function FirstChoice({ candidacies, onAdd }: { candidacies: PublishedCandidacy[]; onAdd: (id: string) => void }) {
  const order = useDrawnOrder(candidacies);
  return (
    <section className="flex flex-col gap-3 rounded-xl border p-4">
      <h2 className="font-medium">Choisissez de une à trois candidatures</h2>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {order.map((candidacy) => (
          <li key={candidacy.id}>
            <button
              type="button"
              onClick={() => onAdd(candidacy.id)}
              className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left hover:bg-muted"
            >
              <span aria-hidden>
                <PartyLogo party={candidacy.party} className="size-8" />
              </span>
              {candidacy.label}
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function EmptySubtopic({ name }: { name: string }) {
  return (
    <p className="border-b border-dashed py-2 text-sm text-muted-foreground">
      <span className="font-medium text-foreground/70">{name}</span>
      {" · "}
      <span className="italic">Aucune des candidatures choisies n’en parle</span>
    </p>
  );
}

export function NothingHere() {
  return <p className="text-sm text-muted-foreground italic">Rien dans le programme sur ce sujet</p>;
}

export function Quote({ extract }: { extract: ComparedExtract }) {
  return (
    <figure className="flex flex-col gap-2">
      <blockquote className="border-l-2 pl-3 text-pretty whitespace-pre-line">« {extract.quote} »</blockquote>
      <figcaption className="text-xs text-muted-foreground">Relevé le {formatRecordedOn(extract.recordedOn)}</figcaption>
      <SourceLinks sources={extract.sources} />
    </figure>
  );
}
