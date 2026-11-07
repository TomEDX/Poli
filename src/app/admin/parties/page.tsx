import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { PartyTable } from "@/modules/reference/components/party-table";
import { getParties } from "@/modules/reference/parties";

export const metadata: Metadata = { title: "Partis et candidatures · Administration · Poli." };

export default function AdminPartiesPage() {
  return (
    <Suspense fallback={<PartiesSkeleton />}>
      <EditableParties />
    </Suspense>
  );
}

async function EditableParties() {
  return <PartyTable parties={await getParties()} />;
}

function PartiesSkeleton() {
  return (
    <div aria-busy className="flex max-w-5xl flex-col gap-4">
      <span className="sr-only">Chargement des partis…</span>
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
