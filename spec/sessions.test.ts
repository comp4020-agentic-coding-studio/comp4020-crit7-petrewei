import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { page } from "./app";

// Every group the page shows must come from the MyTimetable copy, and every
// choosable activity must list exactly its groups there: an invented or dropped
// session makes every clash result untrue.
type Meeting = { type: string; activity: string; staff: string | null };
type Timetable = {
  courses: {
    code: string;
    class: string;
    activities: { code: string; kind: string; groups: { group: string; meetings: Meeting[] }[] }[];
  }[];
};
const timetable: Timetable = JSON.parse(readFileSync("src/data/timetable-2026-s2.json", "utf8"));

// Each choosable activity's groups as the page tags them, in the copy's order,
// which is label order.
it("lists exactly the MyTimetable groups of each lab and tutorial, in label order", async () => {
  const expected = timetable.courses.flatMap((course) =>
    course.activities
      .filter((activity) => activity.groups.length > 1)
      .flatMap((activity) => {
        const id = `${course.code}-${activity.code}`;
        return activity.groups.map((g) => `${id} ${id}-${g.group}`);
      }),
  );
  const shown = [...(await page()).querySelectorAll("[data-group]")].map(
    (el) => `${el.closest("[data-activity]")?.getAttribute("data-activity")} ${el.getAttribute("data-group")}`,
  );
  expect(expected.length).toBeGreaterThan(0);
  expect(shown).toEqual(expected);
});

// The details page gives every meeting a type and an activity code, and every
// lecture a lecturer; a meeting missing them was not copied from it.
it("carries MyTimetable's type and activity code on every meeting", () => {
  for (const course of timetable.courses) {
    expect(course.class).toMatch(/^\d{4}$/);
    for (const activity of course.activities) {
      for (const meeting of activity.groups.flatMap((g) => g.meetings)) {
        expect(meeting.type).toMatch(/^(Lecture|Computer Laboratory|Tutorial|Tutorial Makeup)$/);
        expect(meeting.activity).toMatch(/^\d{2}(-P\d)?$/);
        if (activity.kind === "Lecture") expect(meeting.staff).toBeTruthy();
      }
    }
  }
});
