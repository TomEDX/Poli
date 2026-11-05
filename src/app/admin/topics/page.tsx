import type { Metadata } from "next";
import { Suspense } from "react";

import { TopicTreeEditor } from "@/modules/reference/components/topic-tree-editor";
import { getTopicTree } from "@/modules/reference/topics";

export const metadata: Metadata = { title: "Thématiques · Administration · Poli." };

export default function AdminTopicsPage() {
  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Thématiques</h1>
        <p className="text-sm text-muted-foreground">
          L&apos;arborescence commune range tout le contenu de Poli. Une sous-thématique utilisée par
          un contenu ne peut pas être supprimée.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement des thématiques…</p>}>
        <EditableTopicTree />
      </Suspense>
    </div>
  );
}

async function EditableTopicTree() {
  return <TopicTreeEditor tree={await getTopicTree()} />;
}
