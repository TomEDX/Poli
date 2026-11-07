import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { getPublishedAmendments } from "@/modules/legislation/amendments/queries";
import { EditorialSummary } from "@/modules/legislation/texts/components/editorial-summary";
import { TextAmendments } from "@/modules/legislation/amendments/components/text-amendments";
import { TextHeader } from "@/modules/legislation/texts/components/text-header";
import { FinalVoteResult, TextVotes } from "@/modules/legislation/votes/components/text-votes";
import { SourceLinks } from "@/modules/reference/sources/components/source-links";
import { getPublishedText } from "@/modules/legislation/texts/queries";
import { getPublishedVotes } from "@/modules/legislation/votes/queries";

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
  const [text, votes, amendments] = await Promise.all([cachedText(id), cachedVotes(id), cachedAmendments(id)]);
  if (!text) notFound();
  // A scrutin on an amendment shown below is read with that amendment, not twice.
  const shownWithAmendment = new Set(amendments.map((amendment) => amendment.vote?.id));

  return (
    <article className="flex flex-col gap-8">
      <TextHeader text={text} />
      <FinalVoteResult votes={votes} />
      <EditorialSummary summary={text.summary} />
      <SourceLinks sources={text.sources} />
      <TextVotes votes={votes.filter((vote) => !shownWithAmendment.has(vote.id))} />
      <TextAmendments amendments={amendments} />
    </article>
  );
}

// Cached, so the page is served ahead of time; each editor write regenerates it (ADR 0005).
async function cachedText(id: string) {
  "use cache";
  return getPublishedText(id);
}

async function cachedVotes(textId: string) {
  "use cache";
  return getPublishedVotes(textId);
}

async function cachedAmendments(textId: string) {
  "use cache";
  return getPublishedAmendments(textId);
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
