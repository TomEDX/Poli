import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { PrototypeSwitcher } from "@/components/prototype-switcher";
import { VariantA } from "@/modules/programmes/components/prototype-comparator/variant-a";
import { VariantB } from "@/modules/programmes/components/prototype-comparator/variant-b";
import { VariantC } from "@/modules/programmes/components/prototype-comparator/variant-c";
import { readComparison } from "@/modules/programmes/comparison-params";
import { type ComparisonGrid, getComparisonGrid } from "@/modules/programmes/queries";
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

// PROTOTYPE, throwaway: three layouts of the comparator, switched with ?variant=A|B|C.
const prototypeVariants = [
  { key: "A", name: "Onglets épinglés" },
  { key: "B", name: "Barre qui se réduit, glisser sur téléphone" },
  { key: "C", name: "Sommaire latéral" },
];

// The URL is read here, outside the cache; each comparison is then cached on its own.
async function Comparison({ searchParams }: Pick<PageProps<"/comparateur">, "searchParams">) {
  const candidacies = await publishedCandidacies();
  if (candidacies.length === 0) {
    return <p className="text-muted-foreground">Aucune candidature n’est encore publiée.</p>;
  }
  const params = await searchParams;
  const requested = readComparison(
    params,
    candidacies.map((candidacy) => candidacy.id),
  );
  const variant = [params.variant].flat()[0] ?? "A";
  const grid = withDemoQuotes(await comparisonGrid(requested.candidacyIds), params.demo === "1");
  const topic = grid.find((candidate) => candidate.slug === requested.topic) ?? grid[0];
  const selection = { ...requested, topic: topic?.slug ?? "" };
  const chosen = selection.candidacyIds.flatMap((id) => candidacies.filter((candidacy) => candidacy.id === id));

  const props = { candidacies, chosen, grid, selection, variant };
  return (
    <>
      {variant === "B" ? <VariantB {...props} /> : variant === "C" ? <VariantC {...props} /> : <VariantA {...props} />}
      <PrototypeSwitcher variants={prototypeVariants} />
    </>
  );
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

// PROTOTYPE, throwaway: ?demo=1 fills one subtopic out of two with made-up quotes, in memory
// only, so the page is long enough to judge the pinned bar.
const demoQuotes = [
  "Nous lancerons dès la première année une grande concertation nationale associant les élus locaux, les partenaires sociaux et les associations, afin de bâtir une loi de programmation sur cinq ans.",
  "Le financement sera assuré par le redéploiement de crédits existants, sans hausse d’impôt pour les ménages.",
  "Une évaluation indépendante sera publiée chaque année et présentée au Parlement.",
];

function withDemoQuotes(grid: ComparisonGrid, demo: boolean): ComparisonGrid {
  if (!demo) return grid;
  return grid.map((topic) => ({
    ...topic,
    subtopics: topic.subtopics.map((subtopic, subtopicIndex) => ({
      ...subtopic,
      cells: subtopic.cells.map((cell, cellIndex) =>
        cell.extracts.length > 0 || subtopicIndex % 2 === 1 || (subtopicIndex + cellIndex) % 3 === 2
          ? cell
          : {
              ...cell,
              extracts: demoQuotes.slice(0, 1 + ((subtopicIndex + cellIndex) % 3)).map((quote, index) => ({
                id: subtopic.id + cell.candidacyId + index,
                quote,
                recordedOn: "2026-10-12",
                sources: [],
              })),
            },
      ),
    })),
  }));
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
