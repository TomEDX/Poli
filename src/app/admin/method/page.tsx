import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { MethodEditor } from "@/modules/method/components/method-editor";
import { getEditableMethod } from "@/modules/method/queries";

export const metadata: Metadata = { title: "Page Méthode · Administration · Poli." };

export default function AdminMethodPage() {
  return (
    <Suspense fallback={<MethodSkeleton />}>
      <EditableMethodPage />
    </Suspense>
  );
}

async function EditableMethodPage() {
  return <MethodEditor method={await getEditableMethod()} />;
}

function MethodSkeleton() {
  return (
    <div aria-busy className="flex max-w-3xl flex-col gap-8">
      <span className="sr-only">Chargement de la page Méthode…</span>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
