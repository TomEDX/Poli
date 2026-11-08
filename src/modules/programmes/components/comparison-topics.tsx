import Link from "next/link";

import { Button } from "@/components/ui/button";

import { type ComparisonSelection, comparisonHref } from "../comparison-params";
import type { ComparisonGrid } from "../queries";

// One link per topic, which keeps the chosen candidacies, so the URL always holds both. Tall
// enough on a phone to be touched without missing.
export function ComparisonTopics({ grid, selection }: { grid: ComparisonGrid; selection: ComparisonSelection }) {
  return (
    <nav aria-label="Thématiques">
      <ul className="flex flex-wrap gap-2">
        {grid.map((topic) => {
          const current = topic.slug === selection.topic;
          return (
            <li key={topic.id}>
              <Button
                variant={current ? "default" : "outline"}
                className="h-11 rounded-full px-4 md:h-8 md:px-3"
                nativeButton={false}
                render={
                  <Link
                    href={comparisonHref({ ...selection, topic: topic.slug })}
                    scroll={false}
                    aria-current={current ? "page" : undefined}
                  />
                }
              >
                {topic.name}
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
