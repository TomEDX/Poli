import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { TextTable } from "@/modules/legislation/components/text-table";
import { getTexts } from "@/modules/legislation/texts";
import { getTopicTree } from "@/modules/reference/topics";

export const metadata: Metadata = { title: "Textes · Administration · Poli." };

export default function AdminTextsPage() {
  return (
    <Suspense fallback={<TextsSkeleton />}>
      <EditableTexts />
    </Suspense>
  );
}

async function EditableTexts() {
  const [texts, topicTree] = await Promise.all([getTexts(), getTopicTree()]);
  return <TextTable texts={texts} topicTree={topicTree} />;
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
