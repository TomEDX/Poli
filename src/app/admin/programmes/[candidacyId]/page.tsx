import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { ProgrammeEditor } from "@/modules/programmes/components/programme-editor";
import { getExtracts, getSubtopicsWithoutExtract } from "@/modules/programmes/queries";
import { getParties } from "@/modules/reference/parties/queries";
import { getSources } from "@/modules/reference/sources/queries";
import { getTopicTree } from "@/modules/reference/topics/queries";

export const metadata: Metadata = { title: "Programme · Administration · Poli." };

export default function AdminProgrammePage({ params }: PageProps<"/admin/programmes/[candidacyId]">) {
  return (
    <Suspense fallback={<ProgrammeSkeleton />}>
      <Programme params={params} />
    </Suspense>
  );
}

async function Programme({ params }: Pick<PageProps<"/admin/programmes/[candidacyId]">, "params">) {
  const { candidacyId } = await params;
  // Looked up among the candidacies first, so an id that is not one never reaches the queries.
  const candidacy = (await getParties()).find((party) => party.candidacy?.id === candidacyId)?.candidacy;
  if (!candidacy) notFound();
  const [extracts, missingSubtopics, topicTree, sources] = await Promise.all([
    getExtracts(candidacy.id),
    getSubtopicsWithoutExtract(candidacy.id),
    getTopicTree(),
    getSources(),
  ]);
  return (
    <ProgrammeEditor
      candidacy={candidacy}
      extracts={extracts}
      missingSubtopics={missingSubtopics}
      topicTree={topicTree}
      sources={sources}
    />
  );
}

function ProgrammeSkeleton() {
  return (
    <div aria-busy className="flex max-w-5xl flex-col gap-8">
      <span className="sr-only">Chargement du programme…</span>
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
