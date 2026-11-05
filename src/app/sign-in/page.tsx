import type { Metadata } from "next";
import { Suspense } from "react";

import { SignInForm } from "@/modules/editors/components/sign-in-form";

export const metadata: Metadata = {
  title: "Connexion · Poli.",
  robots: { index: false },
};

export default function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-24">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Connexion des éditeurs</h1>
        <p className="text-sm text-muted-foreground">
          Saisissez votre adresse : vous recevrez un lien pour accéder à l&apos;administration.
        </p>
      </div>
      <Suspense fallback={null}>
        <InvalidLinkNotice searchParams={searchParams} />
      </Suspense>
      <SignInForm />
    </main>
  );
}

async function InvalidLinkNotice({ searchParams }: Pick<PageProps<"/sign-in">, "searchParams">) {
  const { error } = await searchParams;
  if (error !== "invalid-link") return null;
  return (
    <p role="alert" className="text-sm text-destructive">
      Ce lien de connexion n&apos;est plus valable, ou il a été ouvert dans un autre navigateur
      que celui où vous l&apos;avez demandé. Demandez-en un nouveau ici.
    </p>
  );
}
