import type { Metadata } from "next";

import { MethodArticle } from "@/modules/method/components/method-article";
import { getPublishedMethod } from "@/modules/method/queries";

export const metadata: Metadata = {
  title: "Méthode · Poli.",
  description:
    "Comment Poli. choisit les candidatures et les textes, et comment le quiz calcule le score d’accord.",
};

export default function MethodPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 md:px-8">
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Méthode</h1>
        <p className="text-muted-foreground">
          Les règles que suit Poli. pour rester neutre : ce que nous présentons, et comment nous le calculons.
        </p>
      </div>
      <PublishedMethod />
    </main>
  );
}

// Cached, so the page is built ahead of time; each editor write regenerates it (ADR 0005).
async function PublishedMethod() {
  "use cache";
  return <MethodArticle method={await getPublishedMethod()} />;
}
