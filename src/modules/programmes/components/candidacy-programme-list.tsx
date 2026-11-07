import { ChevronRight, Vote } from "lucide-react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";

import type { ProgrammeCandidacy } from "./programme-editor";

// Every candidacy, drafts included: a programme can be prepared before the candidacy goes online.
export function CandidacyProgrammeList({ candidacies }: { candidacies: ProgrammeCandidacy[] }) {
  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">Programmes</h1>
        <p className="text-sm text-muted-foreground">
          Le programme d’une candidature est fait des extraits relevés mot pour mot, rangés par sous-thématique.
        </p>
      </div>

      {candidacies.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Vote />
            </EmptyMedia>
            <EmptyTitle>Aucune candidature</EmptyTitle>
            <EmptyDescription>Créez d’abord une candidature dans Partis et candidatures.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/admin/parties" className={buttonVariants({ variant: "outline" })}>
              Partis et candidatures
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <ul className="flex flex-col divide-y overflow-hidden rounded-xl border">
          {candidacies.map((candidacy) => (
            <li key={candidacy.id}>
              <Link
                href={`/admin/programmes/${candidacy.id}`}
                className="flex items-center justify-between gap-4 px-4 py-3.5 text-sm outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset"
              >
                <span className="font-medium">{candidacy.label}</span>
                <span className="flex items-center gap-3 text-muted-foreground">
                  {candidacy.status === "published" ? "En ligne" : "Brouillon"}
                  <ChevronRight aria-hidden className="size-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
