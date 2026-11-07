// Kept apart from the schema so that client-side validation can use it without Drizzle.
export const publicationStatuses = ["draft", "published"] as const;

export type PublicationStatus = (typeof publicationStatuses)[number];
