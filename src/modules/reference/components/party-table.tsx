"use client";

import { Plus, Vote } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { Party } from "../parties";
import { PartyRow } from "./party-row";
import { PartySheet } from "./party-sheet";

export function PartyTable({ parties }: { parties: Party[] }) {
  // The sheet keeps the party it shows while it closes; null means a new party.
  const [sheet, setSheet] = useState<{ open: boolean; partyId: string | null }>({ open: false, partyId: null });
  const newPartyButton = useRef<HTMLButtonElement>(null);
  const openButtons = useRef(new Map<string, HTMLButtonElement>());
  // Set before a party is deleted: once it is gone, the next row (or the add button) gets
  // the focus, which would otherwise fall back to the top of the page.
  const focusAfterRemoval = useRef<{ removed: string; next: string | null } | null>(null);

  useEffect(() => {
    const pending = focusAfterRemoval.current;
    if (!pending || parties.some((party) => party.id === pending.removed)) return;
    focusAfterRemoval.current = null;
    const target = pending.next ? openButtons.current.get(pending.next) : newPartyButton.current;
    target?.focus();
  }, [parties]);

  const shown = parties.find((party) => party.id === sheet.partyId) ?? null;
  const open = (partyId: string | null) => setSheet({ open: true, partyId });

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">Partis et candidatures</h1>
          <p className="text-sm text-muted-foreground">Seules les candidatures en ligne apparaissent sur le site.</p>
        </div>
        {parties.length > 0 && (
          <Button ref={newPartyButton} onClick={() => open(null)}>
            <Plus data-icon="inline-start" />
            Nouveau parti
          </Button>
        )}
      </div>

      {parties.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Vote />
            </EmptyMedia>
            <EmptyTitle>Aucun parti</EmptyTitle>
            <EmptyDescription>Créez un premier parti et, s’il en présente une, sa candidature.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button ref={newPartyButton} onClick={() => open(null)}>
              <Plus data-icon="inline-start" />
              Nouveau parti
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 px-4 text-muted-foreground">Parti</TableHead>
                <TableHead className="hidden h-11 px-4 text-muted-foreground md:table-cell">Candidat</TableHead>
                <TableHead className="h-11 w-24 px-4 text-right text-muted-foreground">En ligne</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Ouvrir</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {parties.map((party) => (
                <PartyRow
                  key={party.id}
                  party={party}
                  openRef={(button) => {
                    if (button) openButtons.current.set(party.id, button);
                    else openButtons.current.delete(party.id);
                  }}
                  onOpen={() => open(party.id)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <PartySheet
        party={shown}
        open={sheet.open}
        onOpenChange={(isOpen) => setSheet((current) => ({ ...current, open: isOpen }))}
        returnFocus={() => (shown ? openButtons.current.get(shown.id) : newPartyButton.current) ?? null}
        onRemovingParty={(removing) => {
          if (!shown || !removing) {
            focusAfterRemoval.current = null;
            return;
          }
          const index = parties.indexOf(shown);
          const next = parties[index + 1] ?? parties[index - 1];
          focusAfterRemoval.current = { removed: shown.id, next: next?.id ?? null };
        }}
      />
    </div>
  );
}
