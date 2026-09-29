import { describe, expect, it } from "vitest";
import { type Commitment, clashesFor, meetingsClash, parseWeeks } from "../src/lib/clash";

// The clash rule in CLAUDE.md §2: same weekday, one meeting starts before the
// other ends, and at least one shared date. Meetings are from
// src/data/timetable-2026-s2.json unless marked synthetic.
const lab01 = { day: "Thu", start: "11:00", end: "13:00", weeks: "30/7-27/8, 17/9-15/10" };
const comp4020Lecture = { day: "Thu", start: "11:00", end: "13:00", weeks: "30/7-3/9, 24/9-29/10" };
const comp3500Lecture = { day: "Thu", start: "10:00", end: "12:00", weeks: "30/7" };
const tut01 = { day: "Mon", start: "14:00", end: "15:30", weeks: "3/8-31/8, 21/9-28/9, 12/10-26/10" };
const tut02 = { day: "Mon", start: "15:30", end: "17:00", weeks: "3/8-31/8, 21/9-28/9, 12/10-26/10" };
const tut01Makeup = { day: "Tue", start: "14:00", end: "15:30", weeks: "6/10" };
const comp3300LectureB = { day: "Tue", start: "09:00", end: "11:00", weeks: "28/7-1/9, 22/9-27/10" };
const tut03 = { day: "Wed", start: "09:00", end: "10:30", weeks: "5/8-2/9, 23/9-28/10" };

describe("parseWeeks", () => {
  it("reads a single date as one day", () => {
    expect(parseWeeks("30/7").size).toBe(1);
  });

  it("expands ranges in weekly steps", () => {
    expect(parseWeeks("30/7-27/8").size).toBe(5);
    // 3/8–31/8 is five Mondays, 21/9–28/9 two, 12/10–26/10 three.
    expect(parseWeeks("3/8-31/8, 21/9-28/9, 12/10-26/10").size).toBe(10);
  });

  it("gives the same date the same value in different strings", () => {
    const shared = [...parseWeeks("30/7")].filter((d) => parseWeeks("30/7-27/8").has(d));
    expect(shared).toHaveLength(1);
  });
});

describe("meetingsClash", () => {
  it("flags lab 01 against the COMP4020 lecture", () => {
    expect(meetingsClash(lab01, comp4020Lecture)).toBe(true);
  });

  it("flags a one-off date that falls inside a range", () => {
    expect(meetingsClash(lab01, comp3500Lecture)).toBe(true);
  });

  it("does not flag back-to-back meetings", () => {
    expect(meetingsClash(tut01, tut02)).toBe(false);
  });

  it("does not flag overlapping times with no shared date", () => {
    // synthetic: the same Tuesday slot as the 6/10 make-up, in later weeks
    const laterTuesdays = { ...tut01Makeup, weeks: "13/10-27/10" };
    expect(meetingsClash(tut01Makeup, laterTuesdays)).toBe(false);
  });

  it("does not flag overlapping times on different weekdays", () => {
    expect(meetingsClash(comp3300LectureB, tut03)).toBe(false);
  });
});

describe("clashesFor", () => {
  const commitments: Commitment[] = [
    { id: "COMP3300-ComA-01", label: "COMP3300 Computer lab 01", firstChoice: true, meetings: [lab01] },
    { id: "COMP4020-LecA-01", label: "COMP4020 Lecture A", firstChoice: false, meetings: [comp4020Lecture] },
    { id: "COMP3500-LecA-01", label: "COMP3500 Lecture A", firstChoice: false, meetings: [comp3500Lecture] },
    {
      id: "COMP4020-TutA-01",
      label: "COMP4020 Tutorial 01",
      firstChoice: true,
      meetings: [tut01, tut01Makeup],
    },
  ];
  const clashes = clashesFor(commitments);

  it("lists every commitment a first choice clashes with, and never itself", () => {
    expect(clashes.get("COMP3300-ComA-01")?.map((c) => c.id).sort()).toEqual([
      "COMP3500-LecA-01",
      "COMP4020-LecA-01",
    ]);
  });

  it("gives a first choice that fits no clashes", () => {
    expect(clashes.get("COMP4020-TutA-01") ?? []).toEqual([]);
  });
});
