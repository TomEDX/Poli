"use client";

import { cn } from "cn";
import { ChevronRight } from "lucide-react";
import { useOptimistic, useTransition } from "react";

import { Switch } from "@/components/ui/switch";
import { TableCell, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/toast";

import { setCandidacyStatusAction } from "../actions";
import type { Party } from "../queries";
import { PartyLogo } from "./party-logo";

type PartyRowProps = {
  party: Party;
  openRef: React.Ref<HTMLButtonElement>;
  onOpen: () => void;
};

// The whole row opens the party; the button in it is what keyboards and screen readers reach.
export function PartyRow({ party, openRef, onOpen }: PartyRowProps) {
  const { candidacy } = party;
  const candidate = candidacy === null ? "Pas de candidature" : (candidacy.candidateName ?? "Non déclaré");
  const candidateMuted = candidacy?.candidateName == null;

  return (
    <TableRow className="cursor-pointer" onClick={onOpen}>
      <TableCell className="px-4 py-3.5 whitespace-normal">
        <div className="flex items-center gap-3">
          <PartyLogo party={party} />
          <div className="min-w-0">
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
              <span className="font-medium">{party.name}</span>
              {" "}
              <span className="whitespace-nowrap text-muted-foreground">· {party.abbreviation}</span>
            </button>
            <p className={cn("mt-0.5 md:hidden", candidateMuted && "text-muted-foreground")}>{candidate}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className={cn("hidden px-4 py-3.5 md:table-cell", candidateMuted && "text-muted-foreground")}>
        {candidate}
      </TableCell>
      <TableCell className="px-4 py-3.5 text-right" onClick={(event) => event.stopPropagation()}>
        {candidacy && <PublishedSwitch candidacy={candidacy} />}
      </TableCell>
      <TableCell className="w-10 pr-4 pl-0">
        <ChevronRight aria-hidden className="size-4 text-muted-foreground" />
      </TableCell>
    </TableRow>
  );
}

// Publishing is the frequent task, so it stays one click away from the list.
function PublishedSwitch({ candidacy }: { candidacy: NonNullable<Party["candidacy"]> }) {
  const [pending, startTransition] = useTransition();
  const [published, setPublished] = useOptimistic(candidacy.status === "published");

  return (
    <Switch
      checked={published}
      aria-label={`Candidature « ${candidacy.label} » en ligne`}
      aria-busy={pending}
      onCheckedChange={(checked) =>
        startTransition(async () => {
          setPublished(checked);
          const result = await setCandidacyStatusAction(candidacy.id, checked ? "published" : "draft");
          if (!result.ok) toast.add({ title: result.message, type: "error" });
          else toast.add({ title: checked ? "Candidature mise en ligne" : "Candidature retirée du site", type: "success" });
        })
      }
    />
  );
}
