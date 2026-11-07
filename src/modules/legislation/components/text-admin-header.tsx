import { ArrowLeft } from "lucide-react";
import Link from "next/link";

import { textReference } from "../text-labels";
import type { Text } from "../texts";

// Heads the administration page of a text, which gathers its amendments and its scrutins.
export function TextAdminHeader({ text }: { text: Text }) {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/texts"
        className="flex w-fit items-center gap-1 rounded-sm text-sm text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Tous les textes
      </Link>
      <div className="flex flex-col gap-1.5">
        <p className="text-sm font-medium text-muted-foreground">{textReference(text)}</p>
        <h1 className="font-heading text-2xl font-semibold tracking-tight text-balance">{text.officialTitle}</h1>
        <p className="text-sm text-muted-foreground">
          Amendements et scrutins apparaissent sur le site quand le texte est en ligne.
        </p>
      </div>
    </div>
  );
}

