import {
  type Commitment,
  dateOfDay,
  dayOfYear,
  meetingsClash,
  parseWeeks,
  weekdayOf,
} from "./clash";
import { db } from "./db";
import { activities, allocations, courses, groups, meetings } from "./schema";

type MeetingView = typeof meetings.$inferSelect;

type GroupView = {
  id: string;
  label: string;
  free: number | null;
  allocated: boolean;
  meetings: MeetingView[];
};

type ActivityView = {
  id: string;
  courseCode: string;
  courseTitle: string;
  code: string;
  kind: string;
  groups: GroupView[];
};

// Labs and tutorials have more than one group to choose from. The
// commitments are every lecture plus the allocated group of each lab and
// tutorial: the recorded one, else the allocation copied from MyTimetable.
type Timetable = { choosable: ActivityView[]; commitments: Commitment<MeetingView>[] };

export function loadTimetable(): Timetable {
  const titles = new Map(db.select().from(courses).all().map((c) => [c.code, c.title]));
  const recorded = new Map(db.select().from(allocations).all().map((a) => [a.activityId, a.groupLabel]));
  const meetingRows = db.select().from(meetings).all();
  const groupRows = db.select().from(groups).all();

  const views: ActivityView[] = db
    .select()
    .from(activities)
    .all()
    .map((activity) => {
      const allocated = recorded.get(activity.id) ?? activity.allocatedGroup;
      return {
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
            allocated: g.label === allocated,
            meetings: meetingRows.filter((m) => m.groupId === g.id),
          }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      };
    });

  const commitments = views.flatMap((activity) =>
    activity.groups.filter((g) => g.allocated).map((g) => commitment(activity, g)),
  );

  return { choosable: views.filter((a) => a.groups.length > 1), commitments };
}

const commitment = (activity: ActivityView, group: GroupView): Commitment<MeetingView> => {
  const choosable = activity.groups.length > 1;
  return {
    id: group.id,
    label: choosable
      ? `${activity.courseCode} ${activity.kind} group ${group.label}`
      : `${activity.courseCode} ${activity.kind} (${activity.code})`,
    choosable,
    meetings: group.meetings,
  };
};

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
export function weekView(calendar: Commitment<MeetingView>[], requested: string | null) {
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
          .map((meeting, j) => ({ key: `${item.id}-${j}`, owner: item.id, title: item.label, choosable: item.choosable, meeting }))
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
