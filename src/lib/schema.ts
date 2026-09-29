import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

// The timetable, seeded from src/data/timetable-2026-s2.json on every boot.
export const courses = sqliteTable("courses", {
  code: text().primaryKey(),
  title: text().notNull(),
});

export const activities = sqliteTable("activities", {
  id: text().primaryKey(),
  courseCode: text("course_code")
    .notNull()
    .references(() => courses.code),
  code: text().notNull(),
  kind: text().notNull(),
  allocatedGroup: text("allocated_group").notNull(),
});

export const groups = sqliteTable("groups", {
  id: text().primaryKey(),
  activityId: text("activity_id")
    .notNull()
    .references(() => activities.id),
  label: text().notNull(),
  free: int(),
});

export const meetings = sqliteTable("meetings", {
  id: int().primaryKey({ autoIncrement: true }),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id),
  day: text().notNull(),
  start: text().notNull(),
  end: text().notNull(),
  location: text().notNull(),
  weeks: text().notNull(),
});

// The only state a visitor changes: each group's rank within its activity.
export const preferences = sqliteTable("preferences", {
  groupId: text("group_id")
    .primaryKey()
    .references(() => groups.id),
  rank: int().notNull(),
});
