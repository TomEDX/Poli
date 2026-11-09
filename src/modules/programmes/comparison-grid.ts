import {
  BriefcaseIcon,
  GlobeIcon,
  GraduationCapIcon,
  HeartHandshakeIcon,
  LandmarkIcon,
  LeafIcon,
  type LucideIcon,
  ScaleIcon,
  SignpostIcon,
  StethoscopeIcon,
  TagIcon,
} from "lucide-react";

import type { ComparisonGrid } from "./queries";

export type ComparedTopic = ComparisonGrid[number];
export type ComparedSubtopic = ComparedTopic["subtopics"][number];

// Keyed by the topic's URL slug until editors can choose an icon themselves.
const topicIcons: Record<string, LucideIcon> = {
  "economie-et-emploi": BriefcaseIcon,
  "protection-sociale": HeartHandshakeIcon,
  sante: StethoscopeIcon,
  education: GraduationCapIcon,
  "ecologie-et-energie": LeafIcon,
  "securite-et-justice": ScaleIcon,
  immigration: SignpostIcon,
  "institutions-et-democratie": LandmarkIcon,
  "europe-et-international": GlobeIcon,
};

// Every extract of the chosen candidacies on the topic, all subtopics together.
export function extractCount(topic: ComparedTopic): number {
  return topic.subtopics.reduce(
    (total, subtopic) => total + subtopic.cells.reduce((sum, cell) => sum + cell.extracts.length, 0),
    0,
  );
}

export function isAddressedByNone(subtopic: ComparedSubtopic): boolean {
  return subtopic.cells.every((cell) => cell.extracts.length === 0);
}

export function topicIcon(slug: string): LucideIcon {
  return topicIcons[slug] ?? TagIcon;
}
