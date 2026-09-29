import { type Commitment, clashesFor } from "./clash";
import { db } from "./db";
import { activities, courses, groups, meetings, preferences } from "./schema";

export type MeetingView = typeof meetings.$inferSelect;

export type GroupView = {
  id: string;
  label: string;
  free: number | null;
  allocated: boolean;
  meetings: MeetingView[];
  clashes: Commitment[];
};

export type ActivityView = {
  id: string;
  courseCode: string;
  courseTitle: string;
  code: string;
  kind: string;
  groups: GroupView[];
};

// Activities with more than one group are ranked; the rest are fixed
// commitments such as lectures.
export type Timetable = { ranked: ActivityView[]; fixed: ActivityView[] };

export function loadTimetable(): Timetable {
  const titles = new Map(db.select().from(courses).all().map((c) => [c.code, c.title]));
  const ranks = new Map(db.select().from(preferences).all().map((p) => [p.groupId, p.rank]));
  const meetingRows = db.select().from(meetings).all();
  const groupRows = db.select().from(groups).all();

  const views: ActivityView[] = db
    .select()
    .from(activities)
    .all()
    .map((activity) => ({
      id: activity.id,
      courseCode: activity.courseCode,
      courseTitle: titles.get(activity.courseCode) ?? "",
      code: activity.code,
      kind: activity.kind,
      groups: groupRows
        .filter((g) => g.activityId === activity.id)
        .map((g) => ({
          id: g.id,
          label: g.label,
          free: g.free,
          allocated: g.label === activity.allocatedGroup,
          meetings: meetingRows.filter((m) => m.groupId === g.id),
          clashes: [],
        }))
        // Unranked groups keep MyTimetable's order, after any ranked ones.
        .sort(
          (a, b) =>
            (ranks.get(a.id) ?? Infinity) - (ranks.get(b.id) ?? Infinity) ||
            a.label.localeCompare(b.label),
        ),
    }));

  const ranked = views.filter((a) => a.groups.length > 1);
  const fixed = views.filter((a) => a.groups.length === 1);

  const commitments: Commitment[] = [
    ...fixed.map((a) => commitment(a, a.groups[0], false)),
    ...ranked.map((a) => commitment(a, a.groups[0], true)),
  ];
  const clashes = clashesFor(commitments);
  for (const activity of ranked) {
    activity.groups[0].clashes = clashes.get(activity.groups[0].id) ?? [];
  }

  return { ranked, fixed };
}

const commitment = (activity: ActivityView, group: GroupView, firstChoice: boolean): Commitment => ({
  id: group.id,
  label: firstChoice
    ? `${activity.courseCode} ${activity.kind} group ${group.label}`
    : `${activity.courseCode} ${activity.kind} (${activity.code})`,
  firstChoice,
  meetings: group.meetings,
});

// "Thu 11:00–13:00, 30/7 only" for a one-off meeting, else with its weeks.
export function meetingText(meeting: { day: string; start: string; end: string; weeks: string }): string {
  const oneOff = !/[-,]/.test(meeting.weeks);
  const weeks = oneOff ? `${meeting.weeks} only` : `weeks ${meeting.weeks}`;
  return `${meeting.day} ${meeting.start}–${meeting.end}, ${weeks}`;
}
