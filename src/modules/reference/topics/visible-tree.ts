import type { TopicTree } from "./queries";
import { slugify } from "../validation";

export type VisibleRow = { id: string; name: string; slug: string; isFirst: boolean; isLast: boolean };

export type VisibleTopic = VisibleRow & { subtopicCount: number; subtopics: VisibleRow[] };

export type VisibleTree = { searching: boolean; topics: VisibleTopic[] };

/**
 * The rows the editor sees for a search, accents and case ignored. A topic that matches
 * keeps all its subtopics; otherwise only its matching subtopics show. First and last
 * are positions in the whole tree, since a move swaps an item with its real neighbour.
 */
export function visibleTree(tree: TopicTree, query: string): VisibleTree {
  const search = slugify(query);
  const topics = tree.flatMap((topic, topicIndex) => {
    const subtopics = topic.subtopics.map((subtopic, index) => withPosition(subtopic, index, topic.subtopics.length));
    const topicMatches = matches(topic.name, search);
    const shown = topicMatches ? subtopics : subtopics.filter((subtopic) => matches(subtopic.name, search));
    if (!topicMatches && shown.length === 0) return [];
    return [
      {
        ...withPosition(topic, topicIndex, tree.length),
        subtopicCount: topic.subtopics.length,
        subtopics: shown,
      },
    ];
  });
  return { searching: search !== "", topics };
}

function matches(name: string, search: string): boolean {
  return slugify(name).includes(search);
}

function withPosition(item: { id: string; name: string; slug: string }, index: number, count: number): VisibleRow {
  return { id: item.id, name: item.name, slug: item.slug, isFirst: index === 0, isLast: index === count - 1 };
}
