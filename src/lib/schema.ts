import { int, sqliteTable, text } from "drizzle-orm/sqlite-core";

// The schema is the ground truth for the database. To change it: edit here,
// run `pnpm db:generate` to turn the diff into a migration under drizzle/,
// and commit both — the migration applies automatically when the server
// boots (see src/lib/db.ts), locally and deployed. Never edit the database
// by hand: state on the deployed volume outlives every deploy, and the
// migration trail is what keeps old state and new code compatible.

// The timetable, seeded from src/data/timetable-2026-s2.json on every boot.
// Activity and group ids are derived here only, e.g. COMP3300-ComA-01.
export const activityId = (courseCode: string, activityCode: string): string => `${courseCode}-${activityCode}`;
export const groupId = (activity: string, label: string): string => `${activity}-${label}`;

export const courses = sqliteTable("courses", {
  code: text().primaryKey(),
  title: text().notNull(),
  // MyTimetable's class number, and the courses taught in the same sessions.
  classNumber: text("class_number").notNull().default(""),
  sharedWith: text("shared_with").notNull().default(""),
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
  // A COMP4020 tutorial group's name and tutor, from the course website.
  name: text(),
  tutor: text(),
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
  // As MyTimetable's details page gives them, e.g. "Tutorial Makeup" and "01-P2".
  type: text().notNull().default(""),
  activity: text().notNull().default(""),
  staff: text(),
});

// The only state a visitor changes: the group recorded as allocated for a lab
// or tutorial. Without a row, the allocation copied from MyTimetable stands.
export const allocations = sqliteTable("allocations", {
  activityId: text("activity_id")
    .primaryKey()
    .references(() => activities.id),
  groupLabel: text("group_label").notNull(),
});
