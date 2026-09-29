import {
  type Commitment,
  clashesFor,
  dateOfDay,
  dayOfYear,
  isOneOff,
  meetingsClash,
  parseWeeks,
  weekdayOf,
} from "./clash";
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

// What the calendar shows: a lecture, or the group allocated for a ranked
// activity.
type CalendarItem = { id: string; label: string; ranked: boolean; meetings: MeetingView[] };

// Activities with more than one group are ranked. The commitments are every
// lecture plus each ranked activity's first choice; the calendar is every
// lecture plus the group allocated for each ranked activity.
type Timetable = {
  ranked: ActivityView[];
  commitments: Commitment<MeetingView>[];
  calendar: CalendarItem[];
};

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

  const calendar = views.flatMap((activity) =>
    activity.groups
      .filter((g) => g.allocated)
      .map((g) => ({
        id: g.id,
        label: label(activity, g, activity.groups.length > 1),
        ranked: activity.groups.length > 1,
        meetings: g.meetings,
      })),
  );

  return { ranked, commitments, calendar };
}

const label = (activity: ActivityView, group: GroupView, ranked: boolean): string =>
  ranked
    ? `${activity.courseCode} ${activity.kind} group ${group.label}`
    : `${activity.courseCode} ${activity.kind} (${activity.code})`;

const commitment = (
  activity: ActivityView,
  group: GroupView,
  firstChoice: boolean,
): Commitment<MeetingView> => ({
  id: group.id,
  label: label(activity, group, firstChoice),
  firstChoice,
  meetings: group.meetings,
});

// "Thu 11:00–13:00, 30/7 only" for a one-off meeting, else with its weeks.
export function meetingText(meeting: { day: string; start: string; end: string; weeks: string }): string {
  const weeks = isOneOff(meeting.weeks) ? `${meeting.weeks} only` : `weeks ${meeting.weeks}`;
  return `${meeting.day} ${meeting.start}–${meeting.end}, ${weeks}`;
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// Today's date in Canberra as a day of 2026, read as calendar parts rather
// than from a timestamp, since the server runs in UTC (CLAUDE.md §2).
function todayInCanberra(): number {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  if (part("year") < 2026) return -Infinity;
  if (part("year") > 2026) return Infinity;
  return dayOfYear(`${part("day")}/${part("month")}`);
}

// One Mon–Fri week of the calendar. Week 1 starts on the Monday of the first
// meeting and the last week holds the last meeting. `requested` is the ?week
// parameter; anything but a week in range shows the week holding today,
// or the nearest end of the semester.
export function weekView(calendar: CalendarItem[], requested: string | null) {
  const dates = calendar.flatMap((item) => item.meetings.flatMap((m) => [...parseWeeks(m.weeks)]));
  const firstMonday = Math.min(...dates) - weekdayOf(Math.min(...dates));
  const weekOf = (day: number) => Math.floor((day - firstMonday) / 7) + 1;
  const last = weekOf(Math.max(...dates));

  const asked = Number(requested);
  const number =
    requested && Number.isInteger(asked) && asked >= 1 && asked <= last
      ? asked
      : Math.min(Math.max(weekOf(todayInCanberra()), 1), last);
  const monday = firstMonday + (number - 1) * 7;

  const days = WEEKDAYS.map((day, i) => {
    const date = monday + i;
    const entries = calendar
      .flatMap((item) =>
        item.meetings
          .map((meeting, j) => ({ key: `${item.id}-${j}`, owner: item.id, title: item.label, ranked: item.ranked, meeting }))
          .filter(({ meeting }) => meeting.day === day && parseWeeks(meeting.weeks).has(date)),
      )
      .sort((a, b) => a.meeting.start.localeCompare(b.meeting.start));
    // Every entry here meets on this date, so a clash is an overlap in time.
    return {
      day,
      date: dateOfDay(date),
      entries: entries.map((entry) => ({
        ...entry,
        clash: entries.some((other) => other.owner !== entry.owner && meetingsClash(entry.meeting, other.meeting)),
      })),
    };
  });

  return {
    number,
    prev: number > 1 ? number - 1 : null,
    next: number < last ? number + 1 : null,
    days,
  };
}
