// The way an editor moves an item among its siblings.
export type Direction = (typeof directions)[number];

export const directions = ["up", "down"] as const;
