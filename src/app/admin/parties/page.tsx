import type { Metadata } from "next";
import { Suspense } from "react";

import { PartyTable } from "@/modules/reference/components/party-table";
import { getParties } from "@/modules/reference/parties";

export const metadata: Metadata = { title: "Partis et candidatures · Administration · Poli." };

export default function AdminPartiesPage() {
  return (
    <div className="flex max-w-5xl flex-col">
      <Suspense fallback={<p className="text-sm text-muted-foreground">Chargement des partis…</p>}>
        <EditableParties />
      </Suspense>
    </div>
  );
}

async function EditableParties() {
  return <PartyTable parties={await getParties()} />;
}
