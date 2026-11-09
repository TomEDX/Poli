"use client";

import { cn } from "cn";
import type { MouseEvent } from "react";

import { TopicIcon } from "./topic-icon";
import { type JumpTarget, type ReadingPosition, subtopicSectionId } from "./use-reading-position";
import { extractCount, isAddressedByNone } from "../comparison-grid";
import { comparisonHref } from "../comparison-params";
import type { ComparisonGrid } from "../queries";

/**
 * The topics of the comparison, the one being read unfolded on its subtopics. Every list is
 * there, folded, so the previous one folds while the next one unfolds.
 */
export function ComparisonOutline({
  grid,
  candidacyIds,
  reading,
  onJump,
}: {
  grid: ComparisonGrid;
  candidacyIds: string[];
  reading: ReadingPosition;
  onJump: (target: JumpTarget) => void;
}) {
  // Every topic is on the page: a click scrolls to it, a click opening a new tab follows the link.
  function jumpOnClick(event: MouseEvent<HTMLAnchorElement>, target: JumpTarget) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    onJump(target);
  }

  return (
    <nav aria-label="Sommaire">
      <ul className="flex flex-col gap-0.5">
        {grid.map((topic) => {
          const current = topic.slug === reading.topic;
          const count = extractCount(topic);
          return (
            <li key={topic.id}>
              <a
                href={comparisonHref({ candidacyIds, topic: topic.slug })}
                onClick={(event) => jumpOnClick(event, { topic: topic.slug })}
                aria-current={current ? "true" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-sm transition-all duration-300 ease-out motion-reduce:transition-none md:min-h-0",
                  current
                    ? "translate-x-1 border-foreground bg-muted font-medium text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                )}
              >
                <TopicIcon
                  slug={topic.slug}
                  className={cn(
                    "size-4 shrink-0 transition-transform duration-300 motion-reduce:transition-none",
                    current && "scale-125",
                  )}
                />
                <span className="flex-1">{topic.name}</span>
                <span className="text-xs tabular-nums opacity-70">
                  {count}
                  <span className="sr-only">{count > 1 ? " extraits" : " extrait"}</span>
                </span>
              </a>
              <div
                inert={!current}
                className={cn(
                  "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
                  current ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                )}
              >
                <ul className="my-1 ml-5 flex min-h-0 flex-col overflow-hidden border-l">
                  {topic.subtopics.map((subtopic) => (
                    <li key={subtopic.id}>
                      <a
                        href={`#${subtopicSectionId(subtopic.id)}`}
                        onClick={(event) => jumpOnClick(event, { topic: topic.slug, subtopic: subtopic.id })}
                        aria-current={current && reading.subtopic === subtopic.id ? "location" : undefined}
                        className={cn(
                          "-ml-px flex min-h-11 items-center border-l py-1.5 pl-3 text-sm md:block md:min-h-0",
                          current && reading.subtopic === subtopic.id
                            ? "border-foreground text-foreground"
                            : "border-transparent text-muted-foreground hover:text-foreground",
                          isAddressedByNone(subtopic) && "opacity-50",
                        )}
                      >
                        {subtopic.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
