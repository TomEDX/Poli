"use client";

import { cn } from "cn";
import { ArrowDown, ArrowUp, ChevronRight, Landmark, Plus } from "lucide-react";
import { useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";
import type { Direction } from "@/lib/direction";

import { moveParliamentaryGroupAction } from "../../actions";
import type { ParliamentaryGroup, PartySummary } from "../queries";
import { ParliamentaryGroupSheet } from "./parliamentary-group-sheet";
import { iconButton } from "../../components/row-layout";

type ParliamentaryGroupTableProps = {
  legislatureNumber: number;
  groups: ParliamentaryGroup[];
  // Every party, for the links an editor can add to a group.
  parties: PartySummary[];
};

export function ParliamentaryGroupTable({ legislatureNumber, groups, parties }: ParliamentaryGroupTableProps) {
  // The sheet keeps the group it shows while it closes; null means a new group.
  const [sheet, setSheet] = useState<{ open: boolean; groupId: string | null }>({ open: false, groupId: null });
  const [pending, startTransition] = useTransition();
  const newGroupButton = useRef<HTMLButtonElement>(null);
  const openButtons = useRef(new Map<string, HTMLButtonElement>());

  const shown = groups.find((group) => group.id === sheet.groupId) ?? null;
  const open = (groupId: string | null) => setSheet({ open: true, groupId });
  const move = (group: ParliamentaryGroup, direction: Direction) =>
    startTransition(async () => {
      const result = await moveParliamentaryGroupAction(group.id, direction);
      if (!result.ok) toast.add({ title: result.message, type: "error" });
    });

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">Groupes parlementaires</h1>
          <p className="text-sm text-muted-foreground">
            {legislatureNumber}e législature. Le site affiche les groupes dans cet ordre, l’ordre officiel de
            l’Assemblée.
          </p>
        </div>
        {groups.length > 0 && (
          <Button ref={newGroupButton} onClick={() => open(null)}>
            <Plus data-icon="inline-start" />
            Nouveau groupe
          </Button>
        )}
      </div>

      {groups.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Landmark />
            </EmptyMedia>
            <EmptyTitle>Aucun groupe parlementaire</EmptyTitle>
            <EmptyDescription>Créez les groupes de la législature dans l’ordre officiel de l’Assemblée.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button ref={newGroupButton} onClick={() => open(null)}>
              <Plus data-icon="inline-start" />
              Nouveau groupe
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-11 w-10 px-4 text-muted-foreground">
                  <span aria-hidden>N°</span>
                  <span className="sr-only">Rang</span>
                </TableHead>
                <TableHead className="h-11 px-4 text-muted-foreground">Groupe</TableHead>
                <TableHead className="hidden h-11 px-4 text-muted-foreground md:table-cell">Partis reliés</TableHead>
                <TableHead className="h-11 w-20 px-4 text-right text-muted-foreground">Ordre</TableHead>
                <TableHead className="w-10">
                  <span className="sr-only">Ouvrir</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groups.map((group, index) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  rank={index + 1}
                  isFirst={index === 0}
                  isLast={index === groups.length - 1}
                  pending={pending}
                  openRef={(button) => {
                    if (button) openButtons.current.set(group.id, button);
                    else openButtons.current.delete(group.id);
                  }}
                  onOpen={() => open(group.id)}
                  onMove={(direction) => move(group, direction)}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <ParliamentaryGroupSheet
        group={shown}
        parties={parties}
        open={sheet.open}
        onOpenChange={(isOpen) => setSheet((current) => ({ ...current, open: isOpen }))}
        returnFocus={() => (shown ? openButtons.current.get(shown.id) : null) ?? newGroupButton.current}
      />
    </div>
  );
}

type GroupRowProps = {
  group: ParliamentaryGroup;
  rank: number;
  isFirst: boolean;
  isLast: boolean;
  pending: boolean;
  openRef: React.Ref<HTMLButtonElement>;
  onOpen: () => void;
  onMove: (direction: Direction) => void;
};

// The whole row opens the group; the button in it is what keyboards and screen readers reach.
function GroupRow({ group, rank, isFirst, isLast, pending, openRef, onOpen, onMove }: GroupRowProps) {
  const linked = group.parties.length === 0 ? "Aucun parti relié" : group.parties.map((party) => party.abbreviation).join(", ");
  const muted = group.parties.length === 0 && "text-muted-foreground";

  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="px-4 py-3.5 text-muted-foreground tabular-nums">{rank}</TableCell>
      <TableCell className="px-4 py-3.5 whitespace-normal">
        <button
          ref={openRef}
          type="button"
          className="rounded-sm text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          onClick={(event) => {
            event.stopPropagation();
            onOpen();
          }}
        >
          <span className="sr-only">Modifier </span>
          <span className="font-medium">{group.name}</span>
          {" "}
          <span className="whitespace-nowrap text-muted-foreground">· {group.abbreviation}</span>
        </button>
        <p className={cn("mt-0.5 md:hidden", muted)}>{linked}</p>
      </TableCell>
      <TableCell className={cn("hidden px-4 py-3.5 whitespace-normal md:table-cell", muted)}>{linked}</TableCell>
      <TableCell className="px-4 py-3.5" onClick={(event) => event.stopPropagation()}>
        <div className="flex justify-end gap-0.5">
          <Button
            variant="ghost"
            size="icon-xs"
            className={iconButton}
            aria-label={`Monter « ${group.name} »`}
            title="Monter"
            disabled={pending || isFirst}
            onClick={() => onMove("up")}
          >
            <ArrowUp />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            className={iconButton}
            aria-label={`Descendre « ${group.name} »`}
            title="Descendre"
            disabled={pending || isLast}
            onClick={() => onMove("down")}
          >
            <ArrowDown />
          </Button>
        </div>
      </TableCell>
      <TableCell className="w-10 pr-4 pl-0">
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
      </TableCell>
    </TableRow>
  );
}
