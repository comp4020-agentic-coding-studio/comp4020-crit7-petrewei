export type Meeting = {
  day: string;
  start: string;
  end: string;
  weeks: string;
};

export type Commitment<M extends Meeting = Meeting> = {
  id: string;
  label: string;
  // A lab or tutorial, where the student has a group to choose; a lecture has one.
  choosable: boolean;
  meetings: M[];
};

// Days before each month in 2026, which is not a leap year. Dates stay
// calendar dates: a Date at midnight can land on another day on a server in
// UTC, or across the daylight-saving change on 4 October (CLAUDE.md §2).
const DAYS_BEFORE_MONTH = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

export const dayOfYear = (date: string): number => {
  const [day, month] = date.split("/").map(Number);
  return DAYS_BEFORE_MONTH[month - 1] + day;
};

// The inverse of dayOfYear: 208 is "27/7".
export const dateOfDay = (day: number): string => {
  const month = DAYS_BEFORE_MONTH.findLastIndex((before) => before < day);
  return `${day - DAYS_BEFORE_MONTH[month]}/${month + 1}`;
};

// 1 January 2026 was a Thursday, so Monday is 0 and Friday is 4.
export const weekdayOf = (day: number): number => (day + 2) % 7;

// MyTimetable's weeks text, e.g. "30/7-27/8, 17/9-15/10" or "6/10": each
// range is one meeting a week from its first date to its last.
export function parseWeeks(weeks: string): Set<number> {
  const days = new Set<number>();
  for (const part of weeks.split(",")) {
    const [first, last = first] = part.trim().split("-");
    for (let day = dayOfYear(first); day <= dayOfYear(last); day += 7) {
      days.add(day);
    }
  }
  return days;
}

export const isOneOff = (weeks: string): boolean => parseWeeks(weeks).size === 1;

// Times are zero-padded "HH:MM", so string order is time order. Back-to-back
// meetings, where one ends as the other starts, do not overlap.
export function meetingsClash(a: Meeting, b: Meeting): boolean {
  if (a.day !== b.day || !(a.start < b.end && b.start < a.end)) return false;
  const bDays = parseWeeks(b.weeks);
  return [...parseWeeks(a.weeks)].some((day) => bDays.has(day));
}

// For each lab or tutorial group, every other commitment it clashes with.
export function clashesFor<C extends Commitment>(commitments: C[]): Map<string, C[]> {
  const clashes = new Map<string, C[]>();
  for (const choice of commitments.filter((c) => c.choosable)) {
    clashes.set(
      choice.id,
      commitments.filter(
        (other) =>
          other.id !== choice.id &&
          choice.meetings.some((m) => other.meetings.some((n) => meetingsClash(m, n))),
      ),
    );
  }
  return clashes;
}
