import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getAmendments } from "@/modules/legislation/amendments/queries";
import { AmendmentTable } from "@/modules/legislation/amendments/components/amendment-table";
import { TextAdminHeader } from "@/modules/legislation/texts/components/text-admin-header";
import { VoteTable } from "@/modules/legislation/votes/components/vote-table";
import { getText } from "@/modules/legislation/texts/queries";
import { getVotes } from "@/modules/legislation/votes/queries";
import { getParliamentaryGroups } from "@/modules/reference/parliamentary-groups/queries";
import { getSources } from "@/modules/reference/sources/queries";

export const metadata: Metadata = { title: "Amendements et scrutins · Administration · Poli." };

export default function AdminTextPage({ params }: PageProps<"/admin/texts/[id]">) {
  return (
    <Suspense fallback={<TextSkeleton />}>
      <TextAdministration params={params} />
    </Suspense>
  );
}

async function TextAdministration({ params }: Pick<PageProps<"/admin/texts/[id]">, "params">) {
  const { id } = await params;
  const [text, groups, sources] = await Promise.all([getText(id), getParliamentaryGroups(), getSources()]);
  if (!text) notFound();
  const [amendments, votes] = await Promise.all([getAmendments(text.id), getVotes(text.id)]);
  return (
    <div className="flex max-w-5xl flex-col gap-10">
      <TextAdminHeader text={text} />
      <AmendmentTable textId={text.id} amendments={amendments} groups={groups} sources={sources} />
      <VoteTable textId={text.id} votes={votes} groups={groups} amendments={amendments} sources={sources} />
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

