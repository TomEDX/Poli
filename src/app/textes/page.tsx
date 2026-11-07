import type { Metadata } from "next";

import { PublishedTextList } from "@/modules/legislation/components/published-text-list";
import { getPublishedTexts } from "@/modules/legislation/texts";

export const metadata: Metadata = {
  title: "Textes · Poli.",
  description: "Les projets et propositions de loi examinés à l’Assemblée nationale, rangés par thématique.",
};

export default function TextsPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12 md:px-8">
      <div className="flex max-w-2xl flex-col gap-2">
        <h1 className="font-heading text-3xl font-semibold tracking-tight">Textes</h1>
        <p className="text-muted-foreground">
          Les projets et propositions de loi examinés à l’Assemblée nationale, du plus récemment déposé au plus ancien.
        </p>
      </div>
      <PublishedTexts />
    </main>
  );
}

// Cached, so the page is built ahead of time; each editor write regenerates it (ADR 0005).
async function PublishedTexts() {
  "use cache";
  return <PublishedTextList texts={await getPublishedTexts()} />;
}
