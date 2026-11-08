import Link from "next/link";

import { countPublishedTexts } from "@/modules/legislation/texts/queries";
import { publishedTextCountLabel } from "@/modules/legislation/texts/vocabulary";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="font-heading text-5xl font-semibold tracking-tight">Poli.</h1>
      <p className="text-lg text-muted-foreground">
        Comprendre les programmes de l&apos;élection présidentielle et l&apos;activité
        parlementaire, sans orienter son choix.
      </p>
      <ul className="flex flex-col gap-2">
        <li>
          <Link href="/comparateur" className="underline underline-offset-4">
            Comparer les programmes
          </Link>
        </li>
        <li className="flex flex-wrap items-baseline gap-x-2">
          <Link href="/textes" className="underline underline-offset-4">
            Les textes examinés à l&apos;Assemblée
          </Link>
          <PublishedTextCount />
        </li>
        <li>
          <Link href="/quiz" className="underline underline-offset-4">
            Le quiz
          </Link>
        </li>
        <li>
          <Link href="/sources" className="underline underline-offset-4">
            Nos sources
          </Link>
        </li>
        <li>
          <Link href="/methode" className="underline underline-offset-4">
            Notre méthode
          </Link>
        </li>
      </ul>
    </main>
  );
}

// Cached, so the home page is served ahead of time; each editor write regenerates it (ADR 0005).
async function PublishedTextCount() {
  "use cache";
  return <span className="text-sm text-muted-foreground">{publishedTextCountLabel(await countPublishedTexts())}</span>;
}
