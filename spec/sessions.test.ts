import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
import { beforeAll, expect, inject, it } from "vitest";

// Every group the page shows must come from the MyTimetable copy, and every
// choosable activity must list exactly its groups there: an invented or dropped
// session makes every clash result untrue.
const baseUrl = inject("baseUrl");

type Timetable = {
  courses: { code: string; activities: { code: string; groups: { group: string }[] }[] }[];
};
const timetable: Timetable = JSON.parse(readFileSync("src/data/timetable-2026-s2.json", "utf8"));

const activities = timetable.courses.flatMap((course) =>
  course.activities.map((activity) => ({
    id: `${course.code}-${activity.code}`,
    groups: activity.groups.map((g) => `${course.code}-${activity.code}-${g.group}`),
  })),
);
const knownGroups = new Set(activities.flatMap((a) => a.groups));

let doc: Document;
beforeAll(async () => {
  doc = new JSDOM(await (await fetch(baseUrl)).text()).window.document;
});

it("shows no group that is not in the MyTimetable copy", () => {
  const shown = [...doc.querySelectorAll("[data-group]")].map((el) => el.getAttribute("data-group") ?? "");
  expect(shown.length, "the page shows no [data-group] elements").toBeGreaterThan(0);
  expect(shown.filter((g) => !knownGroups.has(g))).toEqual([]);
});

it("lists exactly the MyTimetable groups for every choosable activity", () => {
  for (const activity of activities.filter((a) => a.groups.length > 1)) {
    const listed = [...doc.querySelectorAll(`[data-activity="${activity.id}"] [data-group]`)].map(
      (el) => el.getAttribute("data-group") ?? "",
    );
    expect([...listed].sort(), activity.id).toEqual([...activity.groups].sort());
  }
});
