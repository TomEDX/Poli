import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { Comparator } from "@/modules/programmes/components/comparator";
import { readComparison } from "@/modules/programmes/comparison-params";
import { getComparisonGrid } from "@/modules/programmes/queries";
import { getPublishedCandidacies } from "@/modules/reference/parties/queries";

export const metadata: Metadata = {
  title: "Comparateur de programmes · Poli.",
  description: "Les programmes de l’élection présidentielle côte à côte, cités mot pour mot, thématique par thématique.",
};

export default function ComparatorPage({ searchParams }: PageProps<"/comparateur">) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-12 md:px-8">
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Comparer les programmes</h1>
        <p className="text-muted-foreground">
          Choisissez jusqu’à trois candidatures pour lire leurs programmes côte à côte, cités mot pour mot. Le lien de
          cette page garde votre choix : partagez-le pour montrer la même comparaison. Notre{" "}
          <Link href="/methode" className="underline underline-offset-4 hover:text-foreground">
            méthode
          </Link>{" "}
          explique comment nous choisissons les candidatures.
        </p>
      </div>
      <Suspense fallback={<ComparisonSkeleton />}>
        <Comparison searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// The URL is read here, outside the cache; each comparison is then cached on its own.
async function Comparison({ searchParams }: Pick<PageProps<"/comparateur">, "searchParams">) {
  const candidacies = await publishedCandidacies();
  if (candidacies.length === 0) {
    return <p className="text-muted-foreground">Aucune candidature n’est encore publiée.</p>;
  }
  const requested = readComparison(
    await searchParams,
    candidacies.map((candidacy) => candidacy.id),
  );
  const grid = await comparisonGrid(requested.candidacyIds);
  // The page opens on the link's topic, at the top when the link has none or an unknown one.
  const selection = { ...requested, topic: grid.some((topic) => topic.slug === requested.topic) ? requested.topic : "" };
  const chosen = selection.candidacyIds.flatMap((id) => candidacies.filter((candidacy) => candidacy.id === id));

  return <Comparator candidacies={candidacies} chosen={chosen} grid={grid} selection={selection} />;
}

// Cached, so the page is served ahead of time; each editor write regenerates it (ADR 0005).
async function publishedCandidacies() {
  "use cache";
  return getPublishedCandidacies();
}

async function comparisonGrid(candidacyIds: string[]) {
  "use cache";
  return getComparisonGrid(candidacyIds);
}

function ComparisonSkeleton() {
  return (
    <div aria-busy className="flex flex-col gap-4">
      <span className="sr-only">Chargement du comparateur…</span>
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
