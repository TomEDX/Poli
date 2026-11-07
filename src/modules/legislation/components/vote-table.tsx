"use client";

import { ArrowLeft, ChevronRight, Plus, Vote as VoteIcon } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ParliamentaryGroup } from "@/modules/reference/parliamentary-groups";

import { textReference } from "../text-labels";
import type { Text } from "../texts";
import { voteResultLabels, voteSubjectLabels } from "../vote-kinds";
import { formatHeldOn, voteReference } from "../vote-labels";
import type { Vote } from "../votes";
import { VoteSheet } from "./vote-sheet";

type VoteTableProps = { text: Text; votes: Vote[]; groups: ParliamentaryGroup[] };

export function VoteTable({ text, votes, groups }: VoteTableProps) {
  // The sheet keeps the scrutin it shows while it closes; null means a new scrutin.
  const [sheet, setSheet] = useState<{ open: boolean; voteId: string | null }>({ open: false, voteId: null });
  const newVoteButton = useRef<HTMLButtonElement>(null);
  const openButtons = useRef(new Map<string, HTMLButtonElement>());

  const shown = votes.find((vote) => vote.id === sheet.voteId) ?? null;
  const open = (voteId: string | null) => setSheet({ open: true, voteId });

  return (
    <div className="flex max-w-5xl flex-col gap-8">
      <Link
        href="/admin/texts"
        className="flex w-fit items-center gap-1 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Tous les textes
      </Link>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium text-muted-foreground">{textReference(text)}</p>
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">Scrutins</h1>
          <p className="text-sm text-muted-foreground">
            {text.officialTitle}. Les scrutins apparaissent sur le site quand le texte est en ligne.
          </p>
        </div>
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
        textId={text.id}
        vote={shown}
        groups={groups}
        open={sheet.open}
        onOpenChange={(isOpen) => setSheet((current) => ({ ...current, open: isOpen }))}
        returnFocus={() => (shown ? openButtons.current.get(shown.id) : newVoteButton.current) ?? newVoteButton.current}
      />
    </div>
  );
}

