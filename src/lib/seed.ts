import { eq } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
// Imported, not read from disk, so it is bundled into dist/: the Dockerfile's
// runtime image has no src/ directory.
import timetable from "../data/timetable-2026-s2.json";
import { activities, activityId, courses, groupId, groups, meetings } from "./schema";

// Upserts by primary key so a corrected JSON value replaces the old one, and
// replaces each group's meetings wholesale. Recorded allocations are never touched.
export function seed(db: BetterSQLite3Database): void {
  db.transaction((tx) => {
    for (const course of timetable.courses) {
      const courseRow = {
        code: course.code,
        title: course.title,
        classNumber: course.class,
        sharedWith: course.sharedWith.join(", "),
      };
      tx.insert(courses).values(courseRow).onConflictDoUpdate({ target: courses.code, set: courseRow }).run();

      for (const activity of course.activities) {
        const activityRow = {
          id: activityId(course.code, activity.code),
          courseCode: course.code,
          code: activity.code,
          kind: activity.kind,
          allocatedGroup: activity.allocated,
        };
        tx.insert(activities)
          .values(activityRow)
          .onConflictDoUpdate({ target: activities.id, set: activityRow })
          .run();

        for (const group of activity.groups) {
          const groupRow = {
            id: groupId(activityRow.id, group.group),
            activityId: activityRow.id,
            label: group.group,
            free: group.free,
          };
          tx.insert(groups)
            .values(groupRow)
            .onConflictDoUpdate({ target: groups.id, set: groupRow })
            .run();

          tx.delete(meetings).where(eq(meetings.groupId, groupRow.id)).run();
          tx.insert(meetings)
            .values(group.meetings.map((meeting) => ({ ...meeting, groupId: groupRow.id })))
            .run();
        }
      }
    }
  });
}
