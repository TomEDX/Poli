import { eq } from "drizzle-orm";
import { onTestFinished } from "vitest";

import { db } from "@/lib/db";
import { legislatures, parliamentaryGroups } from "@/modules/reference/schema";

/**
 * A group of the legislature before the current one. The migrations insert a single
 * legislature that every test keeps, so the older one is removed once the test ends.
 */
export async function previousLegislatureGroupId(abbreviation: string): Promise<string> {
  const [legislature] = await db
    .insert(legislatures)
    .values({ number: 16, startedOn: "2022-06-28", endedOn: "2024-06-09" })
    .returning({ id: legislatures.id });
  const [group] = await db
    .insert(parliamentaryGroups)
    .values({ legislatureId: legislature.id, name: `Groupe ${abbreviation}`, abbreviation, position: 1 })
    .returning({ id: parliamentaryGroups.id });
  onTestFinished(async () => {
    await db.delete(parliamentaryGroups).where(eq(parliamentaryGroups.legislatureId, legislature.id));
    await db.delete(legislatures).where(eq(legislatures.id, legislature.id));
  });
  return group.id;
}
