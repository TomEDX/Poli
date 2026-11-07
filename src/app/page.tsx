import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-4 px-6 py-24">
      <h1 className="font-heading text-5xl font-semibold tracking-tight">Poli.</h1>
      <p className="text-lg text-muted-foreground">
        Comprendre les programmes de l&apos;élection présidentielle et l&apos;activité
        parlementaire, sans orienter son choix.
      </p>
      <p>
        <Link href="/sources" className="underline underline-offset-4">
          Nos sources
        </Link>
      </p>
    </main>
  );
}
