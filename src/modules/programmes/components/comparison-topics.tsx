import { cn } from "cn";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";

import { type ComparisonSelection, comparisonHref } from "../comparison-params";
import type { ComparisonGrid } from "../queries";

// One link per topic, which keeps the chosen candidacies, so the URL always holds both. A link
// styled as a button, so screen readers still list it as a link; tall enough to touch on a phone.
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
                className={cn(
                  buttonVariants({ variant: current ? "default" : "outline" }),
                  "h-11 rounded-full px-4 md:h-8 md:px-3",
                )}
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
