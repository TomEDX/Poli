import { Download } from "lucide-react";
import type { Metadata } from "next";

import { buttonVariants } from "@/components/ui/button";
import { SourceList } from "@/modules/reference/sources/components/source-list";
import { getSources } from "@/modules/reference/sources/queries";

export const metadata: Metadata = {
  title: "Sources · Poli.",
  description: "Toutes les sources utilisées par Poli. : programmes, scrutins et textes officiels.",
};

export default function SourcesPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-12 md:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-2xl flex-col gap-2">
          <h1 className="font-heading text-3xl font-semibold tracking-tight">Sources</h1>
          <p className="text-muted-foreground">
            Toutes les sources d’où vient l’information publiée sur Poli., avec la date à laquelle nous les avons
            consultées.
          </p>
        </div>
        <a href="/sources/sources.csv" download className={buttonVariants({ variant: "outline" })}>
          <Download data-icon="inline-start" />
          Télécharger le tableau
        </a>
      </div>
      <PublishedSources />
    </main>
  );
}

// Cached, so the page is built ahead of time; each editor write regenerates it (ADR 0005).
async function PublishedSources() {
  "use cache";
  return <SourceList sources={await getSources()} />;
}
