import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { EditorialSummary } from "@/modules/legislation/components/editorial-summary";
import { TextHeader } from "@/modules/legislation/components/text-header";
import { getPublishedText } from "@/modules/legislation/texts";

export const metadata: Metadata = { title: "Texte · Poli." };

// No generateStaticParams: with Cache Components it must list at least one text, which an
// empty database cannot. Each page is built on its first visit, then served from the cache.
export default function TextPage({ params }: PageProps<"/textes/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 md:px-8">
      <Link
        href="/textes"
        className="flex w-fit items-center gap-1 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Tous les textes
      </Link>
      <Suspense fallback={<TextSkeleton />}>
        <PublishedTextPage params={params} />
      </Suspense>
    </main>
  );
}

async function PublishedTextPage({ params }: Pick<PageProps<"/textes/[id]">, "params">) {
  const { id } = await params;
  const text = await cachedText(id);
  if (!text) notFound();

  return (
    <article className="flex flex-col gap-8">
      <TextHeader text={text} />
      <EditorialSummary summary={text.summary} />
    </article>
  );
}

// Cached, so the page is served ahead of time; each editor write regenerates it (ADR 0005).
async function cachedText(id: string) {
  "use cache";
  return getPublishedText(id);
}

function TextSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <span className="sr-only">Chargement du texte…</span>
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-9 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  );
}
