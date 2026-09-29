import { eq } from "drizzle-orm";
import { db } from "./db";
import { allocations, groups } from "./schema";

// The group labels of a lab or tutorial, or undefined if the activity does
// not exist or has only one group (a lecture has nothing to choose).
export function choosableLabels(activityId: string): string[] | undefined {
  const labels = db
    .select({ label: groups.label })
    .from(groups)
    .where(eq(groups.activityId, activityId))
    .all()
    .map((row) => row.label);
  return labels.length > 1 ? labels : undefined;
}

// Records the allocated group; `label` must already be validated.
export function saveAllocation(activityId: string, label: string): void {
  db.insert(allocations)
    .values({ activityId, groupLabel: label })
    .onConflictDoUpdate({ target: allocations.activityId, set: { groupLabel: label } })
    .run();
}
