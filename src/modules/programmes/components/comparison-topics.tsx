import Link from "next/link";

import { type ComparisonSelection, comparisonHref } from "../comparison-params";
import type { ComparisonGrid } from "../queries";

// One link per topic, which keeps the chosen candidacies, so the URL always holds both.
export function ComparisonTopics({ grid, selection }: { grid: ComparisonGrid; selection: ComparisonSelection }) {
  return (
    <nav aria-label="Thématiques">
      <ul className="flex flex-wrap gap-2">
        {grid.map((topic) => {
          const current = topic.slug === selection.topic;
          return (
            <li key={topic.id}>
              <Link
                href={comparisonHref({ ...selection, topic: topic.slug })}
                scroll={false}
                aria-current={current ? "page" : undefined}
                className="block rounded-full border px-3 py-1 text-sm outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 aria-[current=page]:border-foreground aria-[current=page]:bg-foreground aria-[current=page]:text-background"
              >
                {topic.name}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
