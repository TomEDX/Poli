"use client";

import { ChevronRight, FilePen, Plus } from "lucide-react";
import { useId, useOptimistic, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import type { ParliamentaryGroup } from "@/modules/reference/parliamentary-groups";

import { saveAmendmentAction } from "../actions";
import { amendmentFateLabels } from "../amendment-kinds";
import { amendmentReference, wasVotedOn } from "../amendment-labels";
import type { Amendment } from "../amendments";
import { voteReference } from "../vote-labels";
import { AmendmentSheet } from "./amendment-sheet";

type AmendmentTableProps = { textId: string; amendments: Amendment[]; groups: ParliamentaryGroup[] };

export function AmendmentTable({ textId, amendments, groups }: AmendmentTableProps) {
  // The sheet keeps the amendment it shows while it closes; null means a new amendment.
  const [sheet, setSheet] = useState<{ open: boolean; amendmentId: string | null }>({ open: false, amendmentId: null });
  const newAmendmentButton = useRef<HTMLButtonElement>(null);
  const openButtons = useRef(new Map<string, HTMLButtonElement>());
  const headingId = useId();

  const shown = amendments.find((amendment) => amendment.id === sheet.amendmentId) ?? null;
  const open = (amendmentId: string | null) => setSheet({ open: true, amendmentId });

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 id={headingId} className="font-heading text-xl font-semibold tracking-tight">
            Amendements
          </h2>
          <p className="text-sm text-muted-foreground">
            Reliez un amendement à son scrutin public depuis le scrutin, objet « Amendement ».
          </p>
        </div>
        {amendments.length > 0 && (
          <Button ref={newAmendmentButton} onClick={() => open(null)}>
            <Plus data-icon="inline-start" />
            Nouvel amendement
          </Button>
        )}
      </div>

      {amendments.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FilePen />
            </EmptyMedia>
            <EmptyTitle>Aucun amendement</EmptyTitle>
            <EmptyDescription>Ajoutez les amendements marquants du texte, en brouillon ou en ligne.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button ref={newAmendmentButton} onClick={() => open(null)}>
              <Plus data-icon="inline-start" />
              Nouvel amendement
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 px-4 text-muted-foreground">Amendement</TableHead>
                <TableHead className="h-11 px-4 text-muted-foreground">Sort</TableHead>
                <TableHead className="hidden h-11 px-4 text-muted-foreground md:table-cell">Vote</TableHead>
                <TableHead className="h-11 px-4 text-right text-muted-foreground">En ligne</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Ouvrir</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {amendments.map((amendment) => (
                <TableRow key={amendment.id} className="cursor-pointer" onClick={() => open(amendment.id)}>
                  <TableCell className="px-4 py-3.5 whitespace-normal">
                    <button
                      ref={(button) => {
                        if (button) openButtons.current.set(amendment.id, button);
                        else openButtons.current.delete(amendment.id);
                      }}
                      type="button"
                      className="rounded-sm text-left font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      onClick={(event) => {
                        event.stopPropagation();
                        open(amendment.id);
                      }}
                    >
                      <span className="sr-only">Modifier l’</span>
                      {amendmentReference(amendment)}
                    </button>
                    <p className="mt-0.5 text-muted-foreground">{amendment.authorLabel}</p>
                  </TableCell>
                  <TableCell className="px-4 py-3.5">{amendmentFateLabels[amendment.fate]}</TableCell>
                  <TableCell className="hidden px-4 py-3.5 text-muted-foreground md:table-cell">
                    {voteSummary(amendment)}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-right" onClick={(event) => event.stopPropagation()}>
                    <PublishedSwitch amendment={amendment} />
                  </TableCell>
                  <TableCell className="w-10 pr-4 pl-0">
                    <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AmendmentSheet
        textId={textId}
        amendment={shown}
        groups={groups}
        open={sheet.open}
        onOpenChange={(isOpen) => setSheet((current) => ({ ...current, open: isOpen }))}
        returnFocus={() =>
          (shown ? openButtons.current.get(shown.id) : newAmendmentButton.current) ?? newAmendmentButton.current
        }
      />
    </section>
  );
}

// Publishing is the frequent task, so it stays one click away from the list.
function PublishedSwitch({ amendment }: { amendment: Amendment }) {
  const [pending, startTransition] = useTransition();
  const [published, setPublished] = useOptimistic(amendment.status === "published");

  return (
    <Switch
      checked={published}
      aria-label={`${amendmentReference(amendment)} en ligne`}
      aria-busy={pending}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          setPublished(checked);
          // The form schema keeps only what an amendment is saved with.
          const result = await saveAmendmentAction(amendment.id, { ...amendment, status: checked ? "published" : "draft" });
          if (!result.ok) toast.add({ title: result.message, type: "error" });
          else toast.add({ title: checked ? "Amendement mis en ligne" : "Amendement retiré du site", type: "success" });
        })
      }
    />
  );
}

// What the public page will show in place of the group votes.
function voteSummary(amendment: Amendment): string {
  if (amendment.vote) return voteReference(amendment.vote);
  return wasVotedOn(amendment.fate) ? "Main levée" : "Pas de vote";
}

