"use client";

import { useRouter } from "next/navigation";
import { useId, useOptimistic, useSyncExternalStore, useTransition } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Skeleton } from "@/components/ui/skeleton";
import { shuffled } from "@/lib/shuffle";
import { PartyLogo } from "@/modules/reference/parties/components/party-logo";
import type { PublishedCandidacy } from "@/modules/reference/parties/queries";

import { type ComparisonSelection, comparisonHref } from "../comparison-params";
import { MAX_COMPARED_CANDIDACIES } from "../vocabulary";

// One draw per set of candidacies for the life of the page in the browser: a new visit draws
// again, while choosing a candidacy does not reorder the list under the visitor's finger.
const drawnOrders = new Map<string, string[]>();

/**
 * The published candidacies to compare, in an order drawn in the browser at each visit so
 * that no place favours one (the page itself is cached, so it cannot draw it). Each choice
 * updates the URL, which is what a visitor shares.
 */
export function CandidacyPicker({
  candidacies,
  selection,
}: {
  candidacies: PublishedCandidacy[];
  selection: ComparisonSelection;
}) {
  const router = useRouter();
  const listId = useId();
  const order = useShuffledIds(candidacies.map((candidacy) => candidacy.id).join(","));
  const [chosen, setChosen] = useOptimistic(selection.candidacyIds);
  const [, startTransition] = useTransition();
  const full = chosen.length >= MAX_COMPARED_CANDIDACIES;

  function toggle(id: string, checked: boolean) {
    if (checked && full) return;
    const next = checked ? [...chosen, id] : chosen.filter((other) => other !== id);
    startTransition(() => {
      setChosen(next);
      router.push(comparisonHref({ ...selection, candidacyIds: next }), { scroll: false });
    });
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded-xl border p-4">
      <legend className="px-1 font-medium">Candidatures à comparer</legend>
      <p role="status" className="text-sm text-muted-foreground">
        {status(chosen.length)}
      </p>
      {order === null ? (
        <div aria-busy className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <span className="sr-only">Chargement des candidatures…</span>
          {candidacies.map((candidacy) => (
            <Skeleton key={candidacy.id} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {order.map((id) => {
            const candidacy = candidacies.find((candidate) => candidate.id === id);
            if (!candidacy) return null;
            const checked = chosen.includes(id);
            const inputId = `${listId}-${id}`;
            return (
              <li key={id}>
                <Field orientation="horizontal" className="h-full rounded-lg border px-3 py-2">
                  <Checkbox
                    id={inputId}
                    checked={checked}
                    disabled={!checked && full}
                    onCheckedChange={(value) => toggle(id, value)}
                  />
                  <FieldLabel htmlFor={inputId} className="flex items-center gap-2 font-normal">
                    {/* The label names the candidacy; the logo would repeat its party's name. */}
                    <span aria-hidden>
                      <PartyLogo party={candidacy.party} className="size-8" />
                    </span>
                    {candidacy.label}
                  </FieldLabel>
                </Field>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}

function status(count: number): string {
  if (count >= MAX_COMPARED_CANDIDACIES) {
    return "Trois candidatures choisies, le maximum : décochez-en une pour en choisir une autre.";
  }
  if (count === 0) return "Choisissez de une à trois candidatures.";
  return `${count} candidature${count > 1 ? "s" : ""} choisie${count > 1 ? "s" : ""}, trois au maximum.`;
}

// null on the server and while hydrating, so the order is only ever drawn in the browser.
function useShuffledIds(ids: string): string[] | null {
  return useSyncExternalStore(
    subscribeToNothing,
    () => drawnOrder(ids),
    () => null,
  );
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
