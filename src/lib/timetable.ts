import { type Commitment, clashesFor, isOneOff, meetingsClash } from "./clash";
import { db } from "./db";
import { activities, courses, groups, meetings, preferences } from "./schema";

type MeetingView = typeof meetings.$inferSelect;

type GroupView = {
  id: string;
  label: string;
  free: number | null;
  allocated: boolean;
  meetings: MeetingView[];
  clashes: Commitment<MeetingView>[];
};

type ActivityView = {
  id: string;
  courseCode: string;
  courseTitle: string;
  code: string;
  kind: string;
  groups: GroupView[];
};

// Activities with more than one group are ranked. The commitments are every
// lecture plus each ranked activity's first choice.
type Timetable = { ranked: ActivityView[]; commitments: Commitment<MeetingView>[] };

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
  const commitments = [
    ...views.filter((a) => a.groups.length === 1).map((a) => commitment(a, a.groups[0], false)),
    ...ranked.map((a) => commitment(a, a.groups[0], true)),
  ];
  const clashes = clashesFor(commitments);
  for (const activity of ranked) {
    activity.groups[0].clashes = clashes.get(activity.groups[0].id) ?? [];
  }

  return { ranked, commitments };
}

const commitment = (
  activity: ActivityView,
  group: GroupView,
  firstChoice: boolean,
): Commitment<MeetingView> => ({
  id: group.id,
  label: firstChoice
    ? `${activity.courseCode} ${activity.kind} group ${group.label}`
    : `${activity.courseCode} ${activity.kind} (${activity.code})`,
  firstChoice,
  meetings: group.meetings,
});

// "Thu 11:00–13:00, 30/7 only" for a one-off meeting, else with its weeks.
export function meetingText(meeting: { day: string; start: string; end: string; weeks: string }): string {
  const weeks = isOneOff(meeting.weeks) ? `${meeting.weeks} only` : `weeks ${meeting.weeks}`;
  return `${meeting.day} ${meeting.start}–${meeting.end}, ${weeks}`;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// Every commitment's meetings, by weekday and start time. An entry is marked
// when that meeting clashes with a meeting of another commitment.
export function weekByDay(commitments: Commitment<MeetingView>[]) {
  const entries = commitments.flatMap((c) =>
    c.meetings.map((meeting, i) => ({
      key: `${c.id}-${i}`,
      owner: c.id,
      title: c.label,
      firstChoice: c.firstChoice,
      meeting,
    })),
  );
  const marked = entries.map((entry) => ({
    ...entry,
    oneOff: isOneOff(entry.meeting.weeks),
    clash: entries.some((other) => other.owner !== entry.owner && meetingsClash(entry.meeting, other.meeting)),
  }));
  return WEEKDAYS.map((day) => ({
    day,
    entries: marked
      .filter((entry) => entry.meeting.day === day)
      .sort((a, b) => a.meeting.start.localeCompare(b.meeting.start)),
  }));
}
