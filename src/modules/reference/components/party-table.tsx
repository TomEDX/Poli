"use client";

import { Plus, Vote } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import type { Party } from "../parties";
import { NewPartyForm } from "./new-party-form";
import { PartyRow } from "./party-row";

export function PartyTable({ parties }: { parties: Party[] }) {
  const [adding, setAdding] = useState(false);
  const newPartyButton = useRef<HTMLButtonElement>(null);
  const nameButtons = useRef(new Map<string, HTMLButtonElement>());
  // Set before a party is deleted: once it is gone, the next row (or the add button) gets
  // the focus, which would otherwise fall back to the top of the page.
  const focusAfterRemoval = useRef<{ removed: string; next: string | null } | null>(null);

  useEffect(() => {
    const pending = focusAfterRemoval.current;
    if (!pending || parties.some((party) => party.id === pending.removed)) return;
    focusAfterRemoval.current = null;
    const target = pending.next ? nameButtons.current.get(pending.next) : newPartyButton.current;
    target?.focus();
  }, [parties]);

  const closeForm = () => {
    setAdding(false);
    newPartyButton.current?.focus();
  };

  return (
    <div className="flex max-w-5xl flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">Partis et candidatures</h1>
          <p className="text-sm text-muted-foreground">Seules les candidatures publiées sont visibles du public.</p>
        </div>
        <Button ref={newPartyButton} onClick={() => setAdding(true)}>
          <Plus data-icon="inline-start" />
          Nouveau parti
        </Button>
      </div>

      {adding && <NewPartyForm onClose={closeForm} />}

      {parties.length === 0 ? (
        !adding && (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Vote />
              </EmptyMedia>
              <EmptyTitle>Aucun parti</EmptyTitle>
              <EmptyDescription>Ajoutez un premier parti, puis créez sa candidature.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setAdding(true)}>
                <Plus data-icon="inline-start" />
                Ajouter un parti
              </Button>
            </EmptyContent>
          </Empty>
        )
      ) : (
        <>
          <div className="rounded-xl border">
            {/* On phones each row stacks into a card: name and actions, abbreviation, then candidacy. */}
            <Table className="block md:table">
              <TableHeader className="hidden md:table-header-group">
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Parti</TableHead>
                  <TableHead>Sigle</TableHead>
                  <TableHead>Candidature</TableHead>
                  <TableHead>
                    <span className="sr-only">Actions</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="block md:table-row-group">
                {parties.map((party, index) => (
                  <PartyRow
                    key={party.id}
                    party={party}
                    nameRef={(button) => {
                      if (button) nameButtons.current.set(party.id, button);
                      else nameButtons.current.delete(party.id);
                    }}
                    onRemovingParty={(removing) => {
                      const next = parties[index + 1] ?? parties[index - 1];
                      focusAfterRemoval.current = removing ? { removed: party.id, next: next?.id ?? null } : null;
                    }}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
          <p className="text-xs text-muted-foreground">
            Sélectionnez un nom, un sigle ou un candidat pour le modifier. Un parti qui porte une candidature ne peut pas
            être supprimé.
          </p>
        </>
      )}
    </div>
  );
}
