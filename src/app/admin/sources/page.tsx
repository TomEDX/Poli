import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { SourceTable } from "@/modules/reference/components/source-table";
import { getSources } from "@/modules/reference/sources";

export const metadata: Metadata = { title: "Sources · Administration · Poli." };

export default function AdminSourcesPage() {
  return (
    <Suspense fallback={<SourcesSkeleton />}>
      <EditableSources />
    </Suspense>
  );
}

async function EditableSources() {
  return <SourceTable sources={await getSources()} />;
}

function SourcesSkeleton() {
  return (
    <div aria-busy className="flex max-w-5xl flex-col gap-8">
      <span className="sr-only">Chargement des sources…</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
