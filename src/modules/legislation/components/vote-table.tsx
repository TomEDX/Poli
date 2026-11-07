"use client";

import { ChevronRight, Plus, Vote as VoteIcon } from "lucide-react";
import { useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ParliamentaryGroup } from "@/modules/reference/parliamentary-groups";

import { amendmentReference } from "../amendment-labels";
import type { Amendment } from "../amendments";
import { voteResultLabels, voteSubjectLabels } from "../vote-kinds";
import { formatHeldOn, voteReference } from "../vote-labels";
import type { Vote } from "../votes";
import { VoteSheet } from "./vote-sheet";

type VoteTableProps = { textId: string; votes: Vote[]; groups: ParliamentaryGroup[]; amendments: Amendment[] };

export function VoteTable({ textId, votes, groups, amendments }: VoteTableProps) {
  // The sheet keeps the scrutin it shows while it closes; null means a new scrutin.
  const [sheet, setSheet] = useState<{ open: boolean; voteId: string | null }>({ open: false, voteId: null });
  const newVoteButton = useRef<HTMLButtonElement>(null);
  const openButtons = useRef(new Map<string, HTMLButtonElement>());
  const headingId = useId();

  const shown = votes.find((vote) => vote.id === sheet.voteId) ?? null;
  const open = (voteId: string | null) => setSheet({ open: true, voteId });
  const amendmentOf = (vote: Vote) => amendments.find((amendment) => amendment.id === vote.amendmentId);

  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h2 id={headingId} className="font-heading text-xl font-semibold tracking-tight">
          Scrutins
        </h2>
        {votes.length > 0 && (
          <Button ref={newVoteButton} onClick={() => open(null)}>
            <Plus data-icon="inline-start" />
            Nouveau scrutin
          </Button>
        )}
      </div>

      {votes.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <VoteIcon />
            </EmptyMedia>
            <EmptyTitle>Aucun scrutin</EmptyTitle>
            <EmptyDescription>
              Ajoutez le vote sur l’ensemble du texte, ou sur un article, un amendement ou une motion.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button ref={newVoteButton} onClick={() => open(null)}>
              <Plus data-icon="inline-start" />
              Nouveau scrutin
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 px-4 text-muted-foreground">Objet</TableHead>
                <TableHead className="hidden h-11 px-4 text-muted-foreground md:table-cell">Date</TableHead>
                <TableHead className="h-11 px-4 text-muted-foreground">Résultat</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Ouvrir</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {votes.map((vote) => (
                <TableRow key={vote.id} className="cursor-pointer" onClick={() => open(vote.id)}>
                  <TableCell className="px-4 py-3.5 whitespace-normal">
                    <button
                      ref={(button) => {
                        if (button) openButtons.current.set(vote.id, button);
                        else openButtons.current.delete(vote.id);
                      }}
                      type="button"
                      className="rounded-sm text-left font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      onClick={(event) => {
                        event.stopPropagation();
                        open(vote.id);
                      }}
                    >
                      <span className="sr-only">Modifier </span>
                      {voteSubjectLabels[vote.subject]}
                    </button>
                    <p className="mt-0.5 text-muted-foreground">
                      {voteReference(vote)}
                      {amendmentOf(vote) && <> · {amendmentReference(amendmentOf(vote)!)}</>}
                      <span className="md:hidden"> · {formatHeldOn(vote.heldOn)}</span>
                    </p>
                  </TableCell>
                  <TableCell className="hidden px-4 py-3.5 whitespace-nowrap tabular-nums md:table-cell">
                    {formatHeldOn(vote.heldOn)}
                  </TableCell>
                  <TableCell className="px-4 py-3.5">{voteResultLabels[vote.result]}</TableCell>
                  <TableCell className="w-10 pr-4 pl-0">
                    <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <VoteSheet
        textId={textId}
        vote={shown}
        groups={groups}
        amendments={amendments}
        open={sheet.open}
        onOpenChange={(isOpen) => setSheet((current) => ({ ...current, open: isOpen }))}
        returnFocus={() => (shown ? openButtons.current.get(shown.id) : newVoteButton.current) ?? newVoteButton.current}
      />
    </section>
  );
}

