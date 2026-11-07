import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getAmendments } from "@/modules/legislation/amendments";
import { AmendmentTable } from "@/modules/legislation/components/amendment-table";
import { TextAdminHeader } from "@/modules/legislation/components/text-admin-header";
import { VoteTable } from "@/modules/legislation/components/vote-table";
import { getTexts } from "@/modules/legislation/texts";
import { getVotes } from "@/modules/legislation/votes";
import { getParliamentaryGroups } from "@/modules/reference/parliamentary-groups";

export const metadata: Metadata = { title: "Amendements et scrutins · Administration · Poli." };

export default function AdminTextPage({ params }: PageProps<"/admin/texts/[id]">) {
  return (
    <Suspense fallback={<TextSkeleton />}>
      <EditableText params={params} />
    </Suspense>
  );
}

async function EditableText({ params }: Pick<PageProps<"/admin/texts/[id]">, "params">) {
  const { id } = await params;
  const [texts, groups] = await Promise.all([getTexts(), getParliamentaryGroups()]);
  const text = texts.find((candidate) => candidate.id === id);
  if (!text) notFound();
  const [amendments, votes] = await Promise.all([getAmendments(text.id), getVotes(text.id)]);
  return (
    <div className="flex max-w-5xl flex-col gap-10">
      <TextAdminHeader text={text} />
      <AmendmentTable textId={text.id} amendments={amendments} groups={groups} />
      <VoteTable textId={text.id} votes={votes} groups={groups} amendments={amendments} />
    </div>
  );
}

function TextSkeleton() {
  return (
    <div aria-busy className="flex max-w-5xl flex-col gap-8">
      <span className="sr-only">Chargement des amendements et des scrutins…</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

