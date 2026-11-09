import { createElement } from "react";

import { topicIcon } from "../comparison-grid";

// Decorative: the topic's name always sits next to it.
export function TopicIcon({ slug, className }: { slug: string; className?: string }) {
  return createElement(topicIcon(slug), { "aria-hidden": true, className });
}
