import { eq, inArray } from "drizzle-orm";
import { db } from "./db";
import { groupId, groups, preferences } from "./schema";

// The group labels of a rankable activity, or undefined if the activity does
// not exist or has only one group (a lecture has nothing to rank).
export function rankableLabels(activityId: string): string[] | undefined {
  const labels = db
    .select({ label: groups.label })
    .from(groups)
    .where(eq(groups.activityId, activityId))
    .all()
    .map((row) => row.label);
  return labels.length > 1 ? labels : undefined;
}

// Replaces the activity's whole ranking; `labels` must already be validated.
export function saveRanking(activityId: string, labels: string[]): void {
  const groupIds = labels.map((label) => groupId(activityId, label));
  db.transaction((tx) => {
    tx.delete(preferences).where(inArray(preferences.groupId, groupIds)).run();
    tx.insert(preferences)
      .values(groupIds.map((id, rank) => ({ groupId: id, rank })))
      .run();
  });
}
