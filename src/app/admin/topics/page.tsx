import type { Metadata } from "next";
import { Suspense } from "react";

import { TopicTreeTable } from "@/modules/reference/components/topic-tree-table";
import { getTopicTree } from "@/modules/reference/topics";

export const metadata: Metadata = { title: "Thématiques · Administration · Poli." };

export default function AdminTopicsPage() {
  return (
    <div className="flex max-w-4xl flex-col">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement des thématiques…</p>}>
        <EditableTopicTree />
      </Suspense>
    </div>
  );
}

async function EditableTopicTree() {
  return <TopicTreeTable tree={await getTopicTree()} />;
}
