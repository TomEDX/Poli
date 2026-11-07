import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ParliamentaryGroupTable } from "@/modules/reference/components/parliamentary-group-table";
import { getCurrentLegislature, getParliamentaryGroups } from "@/modules/reference/parliamentary-groups";
import { getParties } from "@/modules/reference/parties";

export const metadata: Metadata = { title: "Groupes parlementaires · Administration · Poli." };

export default function AdminParliamentaryGroupsPage() {
  return (
    <Suspense fallback={<GroupsSkeleton />}>
      <EditableGroups />
    </Suspense>
  );
}

async function EditableGroups() {
  const [legislature, groups, parties] = await Promise.all([
    getCurrentLegislature(),
    getParliamentaryGroups(),
    getParties(),
  ]);
  return (
    <ParliamentaryGroupTable
      legislatureNumber={legislature.number}
      groups={groups}
      parties={parties.map(({ id, name, abbreviation }) => ({ id, name, abbreviation }))}
    />
  );
}

function GroupsSkeleton() {
  return (
    <div aria-busy className="flex max-w-4xl flex-col gap-8">
      <span className="sr-only">Chargement des groupes parlementaires…</span>
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
