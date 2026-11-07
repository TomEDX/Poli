import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { CandidacyProgrammeList } from "@/modules/programmes/components/candidacy-programme-list";
import { getParties } from "@/modules/reference/parties/queries";

export const metadata: Metadata = { title: "Programmes · Administration · Poli." };

export default function AdminProgrammesPage() {
  return (
    <Suspense fallback={<ProgrammesSkeleton />}>
      <Candidacies />
    </Suspense>
  );
}

async function Candidacies() {
  const candidacies = (await getParties()).flatMap((party) => (party.candidacy ? [party.candidacy] : []));
  return <CandidacyProgrammeList candidacies={candidacies} />;
}

function ProgrammesSkeleton() {
  return (
    <div aria-busy className="flex max-w-4xl flex-col gap-8">
      <span className="sr-only">Chargement des candidatures…</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
