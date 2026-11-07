import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { TextTable } from "@/modules/legislation/texts/components/text-table";
import { getTexts } from "@/modules/legislation/texts/queries";
import { getSources } from "@/modules/reference/sources/queries";
import { getTopicTree } from "@/modules/reference/topics/queries";

export const metadata: Metadata = { title: "Textes · Administration · Poli." };

export default function AdminTextsPage() {
  return (
    <Suspense fallback={<TextsSkeleton />}>
      <EditableTexts />
    </Suspense>
  );
}

async function EditableTexts() {
  const [texts, topicTree, sources] = await Promise.all([getTexts(), getTopicTree(), getSources()]);
  return <TextTable texts={texts} topicTree={topicTree} sources={sources} />;
}

function TextsSkeleton() {
  return (
    <div aria-busy className="flex max-w-5xl flex-col gap-8">
      <span className="sr-only">Chargement des textes…</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
