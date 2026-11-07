import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { VoteTable } from "@/modules/legislation/components/vote-table";
import { getTexts } from "@/modules/legislation/texts";
import { getVotes } from "@/modules/legislation/votes";
import { getParliamentaryGroups } from "@/modules/reference/parliamentary-groups";

export const metadata: Metadata = { title: "Scrutins · Administration · Poli." };

export default function AdminTextVotesPage({ params }: PageProps<"/admin/texts/[id]">) {
  return (
    <Suspense fallback={<VotesSkeleton />}>
      <EditableVotes params={params} />
    </Suspense>
  );
}

async function EditableVotes({ params }: Pick<PageProps<"/admin/texts/[id]">, "params">) {
  const { id } = await params;
  const [texts, groups] = await Promise.all([getTexts(), getParliamentaryGroups()]);
  const text = texts.find((candidate) => candidate.id === id);
  if (!text) notFound();
  const votes = await getVotes(text.id);
  return <VoteTable text={text} votes={votes} groups={groups} />;
}

function VotesSkeleton() {
  return (
    <div aria-busy className="flex max-w-5xl flex-col gap-8">
      <span className="sr-only">Chargement des scrutins…</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

