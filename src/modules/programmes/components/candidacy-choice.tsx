"use client";

import { Menu } from "@base-ui/react/menu";
import { cn } from "cn";
import { PlusIcon, XIcon } from "lucide-react";
import { useSyncExternalStore } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { shuffled } from "@/lib/shuffle";
import { PartyLogo } from "@/modules/reference/parties/components/party-logo";
import type { PublishedCandidacy } from "@/modules/reference/parties/queries";

import { CandidacyName } from "./candidacy-name";
import { MAX_COMPARED_CANDIDACIES, partyCandidacyLabel } from "../vocabulary";

// One draw per set of candidacies for the life of the page in the browser: a new visit draws
// again, while adding a candidacy does not reorder the others under the visitor's finger.
const drawnOrders = new Map<string, string[]>();

/** Shown in place of the comparison until a first candidacy is chosen. */
export function FirstChoice({
  candidacies,
  onAdd,
}: {
  candidacies: PublishedCandidacy[];
  onAdd: (id: string) => void;
}) {
  const order = useDrawnOrder(candidacies);
  return (
    <section aria-labelledby="first-choice" className="flex flex-col gap-3 rounded-xl border p-4">
      <h2 id="first-choice" className="font-medium">
        Choisissez de une à trois candidatures
      </h2>
      {order === null ? (
        <div aria-busy className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <span className="sr-only">Chargement des candidatures…</span>
          {candidacies.map((candidacy) => (
            <Skeleton key={candidacy.id} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {order.map((candidacy) => (
            <li key={candidacy.id}>
              <button
                type="button"
                onClick={() => onAdd(candidacy.id)}
                className="flex h-full w-full items-center gap-2 rounded-lg border px-3 py-2 text-left hover:bg-muted"
              >
                <CandidacyName candidacy={candidacy} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Opens the candidacies not chosen yet, in the drawn order, over the rest of the page. Gone
 * once the maximum is chosen. Compact on a phone: a "+" next to the chosen candidacies.
 */
export function AddCandidacy({
  candidacies,
  chosenIds,
  onAdd,
  compact = false,
}: {
  candidacies: PublishedCandidacy[];
  chosenIds: string[];
  onAdd: (id: string) => void;
  compact?: boolean;
}) {
  const order = useDrawnOrder(candidacies);
  const available = (order ?? []).filter((candidacy) => !chosenIds.includes(candidacy.id));
  if (chosenIds.length >= MAX_COMPARED_CANDIDACIES || available.length === 0) return null;
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={compact ? "Ajouter une candidature" : undefined}
        className={cn(
          "flex items-center gap-1.5 border border-dashed text-sm text-muted-foreground hover:border-foreground hover:text-foreground data-popup-open:border-foreground data-popup-open:text-foreground",
          compact ? "size-9 justify-center rounded-full" : "w-full rounded-lg px-3 py-2",
        )}
      >
        <PlusIcon aria-hidden className="size-4 shrink-0" />
        {!compact && "Ajouter une candidature"}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner side="bottom" align="start" sideOffset={8} className="z-50">
          <Menu.Popup className="flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-1 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg outline-none">
            {available.map((candidacy) => (
              <Menu.Item
                key={candidacy.id}
                onClick={() => onAdd(candidacy.id)}
                className="flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-sm outline-none data-highlighted:bg-muted"
              >
                <CandidacyName candidacy={candidacy} />
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/** A chosen candidacy at the head of its column: the candidate first, the party under it. */
export function NameTile({ candidacy, onRemove }: { candidacy: PublishedCandidacy; onRemove: () => void }) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-foreground/15 bg-muted px-3 py-2.5 shadow-sm">
      <span aria-hidden className="hidden shrink-0 lg:block">
        <PartyLogo party={candidacy.party} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col [overflow-wrap:anywhere]">
        <span className="text-sm leading-tight font-semibold lg:text-base">
          {candidacy.candidateName ?? candidacy.party.name}
        </span>
        <span className="text-xs text-muted-foreground">
          {candidacy.candidateName ? candidacy.party.name : partyCandidacyLabel}
        </span>
      </span>
      <RemoveButton candidacy={candidacy} onRemove={onRemove} />
    </div>
  );
}

/** A chosen candidacy on a phone, small enough to leave room for reading. */
export function CandidacyChip({ candidacy, onRemove }: { candidacy: PublishedCandidacy; onRemove: () => void }) {
  return (
    <div className="flex items-center gap-1 rounded-full border py-0.5 pr-0.5 pl-1">
      {candidacy.party.logo && (
        <span aria-hidden>
          <PartyLogo party={candidacy.party} className="size-7 rounded-full" />
        </span>
      )}
      <span aria-hidden className="px-1 text-sm font-medium">
        {candidacy.party.abbreviation}
      </span>
      <span className="sr-only">{candidacy.label}</span>
      <RemoveButton candidacy={candidacy} onRemove={onRemove} />
    </div>
  );
}

function RemoveButton({ candidacy, onRemove }: { candidacy: PublishedCandidacy; onRemove: () => void }) {
  return (
    <button
      type="button"
      onClick={onRemove}
      aria-label={`Retirer ${candidacy.label}`}
      className="ml-auto flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-background hover:text-foreground"
    >
      <XIcon aria-hidden className="size-4" />
    </button>
  );
}

// null on the server and while hydrating, so the order is only ever drawn in the browser: the
// page itself is cached, so it cannot draw it.
function useDrawnOrder(candidacies: PublishedCandidacy[]): PublishedCandidacy[] | null {
  const ids = candidacies.map((candidacy) => candidacy.id).join(",");
  const order = useSyncExternalStore(
    subscribeToNothing,
    () => drawnOrder(ids),
    () => null,
  );
  return order && order.flatMap((id) => candidacies.filter((candidacy) => candidacy.id === id));
}

function drawnOrder(ids: string): string[] {
  let order = drawnOrders.get(ids);
  if (!order) {
    order = shuffled(ids.split(","));
    drawnOrders.set(ids, order);
  }
  return order;
}

// The draw never changes once made, so there is nothing to listen to.
function subscribeToNothing() {
  return () => {};
}
