import { asc } from "drizzle-orm";

import { subtopics, topics } from "@/modules/reference/schema";

import { questions } from "./schema";

// The order of the quiz: the topic tree, then the order the editors gave within each subtopic.
// The same tie-breaks as the topic tree, so every list of questions agrees.
export const questionOrder = [
  asc(topics.position),
  asc(topics.createdAt),
  asc(subtopics.position),
  asc(subtopics.createdAt),
  asc(questions.position),
  asc(questions.createdAt),
];
