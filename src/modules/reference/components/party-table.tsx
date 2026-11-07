"use client";

import { Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/modules/editors/editor-write";

import type { Party } from "../parties";
import { NewPartyForm } from "./new-party-form";
import { type PartyField, PartyRow } from "./party-row";
import { partyGrid } from "./row-layout";

export function PartyTable({ parties }: { parties: Party[] }) {
  const [editing, setEditing] = useState<{ id: string; field: PartyField } | null>(null);
  const [adding, setAdding] = useState(false);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Administration</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Partis et candidatures</h1>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus /> Nouveau parti
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border text-sm">
        <div aria-hidden className={`${partyGrid} bg-muted/50 py-2 font-medium text-muted-foreground`}>
          <span className="px-1">Parti</span>
          <span className="hidden px-1 md:block">Sigle</span>
          <span className="hidden px-1 md:block">Candidature</span>
        </div>
        <ul>
          {parties.length === 0 && !adding && (
            <li className="border-t py-10 text-center text-muted-foreground">Aucun parti pour l&apos;instant.</li>
          )}

          {parties.map((party) => (
            <PartyRow
              key={party.id}
              party={party}
              editing={editing?.id === party.id ? editing.field : null}
              onEditingChange={(field) => setEditing(field ? { id: party.id, field } : null)}
              pending={pending}
              error={rowError?.id === party.id ? rowError.message : null}
              onAction={(action: () => Promise<ActionResult>) =>
                startTransition(async () => {
                  const result = await action();
                  setRowError(result.ok ? null : { id: party.id, message: result.message });
                })
              }
            />
          ))}

          {adding && (
            <li className="border-t bg-muted/20 px-3 py-2">
              <NewPartyForm onClose={() => setAdding(false)} />
            </li>
          )}
        </ul>
      </div>
      <p className="text-xs text-muted-foreground">
        <span className="hidden md:inline">Double-cliquez sur un nom, un sigle ou un candidat pour le modifier. </span>
        <span className="md:hidden">Touchez un nom, un sigle ou un candidat pour le modifier. </span>
        Seules les candidatures publiées sont visibles du public. Un parti qui porte une candidature ne peut pas être
        supprimé.
      </p>
    </div>
  );
}
