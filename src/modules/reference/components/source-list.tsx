import { ExternalLink } from "lucide-react";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { formatConsultedOn } from "../source-dates";
import { sourceKindLabels } from "../source-kinds";
import type { Source } from "../sources";

// The public table of the Sources page. On phones, the organization, type and date go
// under the title instead of in columns.
export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) {
    return <p className="text-muted-foreground">Aucune source n’est encore recensée.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border">
      <Table>
        <caption className="sr-only">Sources utilisées par Poli., par organisme</caption>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="h-11 px-4 text-muted-foreground">Titre</TableHead>
            <TableHead className="hidden h-11 px-4 text-muted-foreground md:table-cell">Organisme</TableHead>
            <TableHead className="hidden h-11 px-4 text-muted-foreground md:table-cell">Type</TableHead>
            <TableHead className="hidden h-11 px-4 text-muted-foreground md:table-cell">Consultée le</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sources.map((source) => {
            const consultedOn = formatConsultedOn(source.consultedOn);
            return (
              <TableRow key={source.id}>
                <TableCell className="px-4 py-3.5 whitespace-normal">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {source.title}
                    <ExternalLink aria-hidden className="ml-1 inline size-3.5 align-baseline text-muted-foreground" />
                    <span className="sr-only"> (nouvel onglet)</span>
                  </a>
                  <p className="mt-0.5 text-muted-foreground md:hidden">
                    {source.organization} · {sourceKindLabels[source.kind]} · consultée le {consultedOn}
                  </p>
                </TableCell>
                <TableCell className="hidden px-4 py-3.5 whitespace-normal md:table-cell">{source.organization}</TableCell>
                <TableCell className="hidden px-4 py-3.5 md:table-cell">{sourceKindLabels[source.kind]}</TableCell>
                <TableCell className="hidden px-4 py-3.5 tabular-nums md:table-cell">{consultedOn}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
