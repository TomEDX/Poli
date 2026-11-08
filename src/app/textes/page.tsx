import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { PublishedTextList } from "@/modules/legislation/texts/components/published-text-list";
import { TextListFilters } from "@/modules/legislation/texts/components/text-list-filters";
import { readTextList, textListHref } from "@/modules/legislation/texts/list-params";
import { getPublishedTexts, getPublishedTextTopics, type TextFilters } from "@/modules/legislation/texts/queries";

export const metadata: Metadata = {
  title: "Textes · Poli.",
  description: "Les projets et propositions de loi examinés à l’Assemblée nationale, rangés par thématique.",
};

export default function TextsPage({ searchParams }: PageProps<"/textes">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 md:px-8">
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Textes</h1>
        <p className="text-muted-foreground">
          Les projets et propositions de loi examinés à l’Assemblée nationale. Filtrez-les par thématique ou par type,
          et triez-les par date de dépôt. Notre{" "}
          <Link href="/methode" className="underline underline-offset-4 hover:text-foreground">
            méthode
          </Link>{" "}
          explique comment nous les choisissons.
        </p>
      </div>
      <Suspense fallback={<TextListSkeleton />}>
        <FilteredTexts searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// The URL is read here, outside the cache; each set of filters is then cached on its own.
async function FilteredTexts({ searchParams }: Pick<PageProps<"/textes">, "searchParams">) {
  const topics = await publishedTextTopics();
  const { selection, filters } = readTextList(await searchParams, topics);
  const narrowed = Boolean(filters.topicId || filters.subtopicId || filters.nature);

  return (
    <div className="flex flex-col gap-6">
      {/* Keyed by the URL, so going back or clearing the filters resets what the form shows. */}
      <TextListFilters key={textListHref(selection)} topics={topics} selection={selection} />
      <PublishedTexts filters={filters} narrowed={narrowed} />
    </div>
  );
}

// Cached, so the list is served ahead of time; each editor write regenerates it (ADR 0005).
async function PublishedTexts({ filters, narrowed }: { filters: TextFilters; narrowed: boolean }) {
  "use cache";
  return <PublishedTextList texts={await getPublishedTexts(filters)} narrowed={narrowed} />;
}

async function publishedTextTopics() {
  "use cache";
  return getPublishedTextTopics();
}

function TextListSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <span className="sr-only">Chargement des textes…</span>
      <Skeleton className="h-44 w-full rounded-xl" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
