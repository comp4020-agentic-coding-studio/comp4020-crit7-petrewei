import { JSDOM } from "jsdom";
import { describe, expect, inject, it } from "vitest";

// Contract for the preference page, checked over HTTP against the built app:
// - GET / lists each choosable activity as [data-activity="COURSE-ACT"], holding
//   its groups as [data-group="COURSE-ACT-NN"] in rank order, first choice first.
// - POST /api/preferences with activity=COURSE-ACT and order=NN,NN,... saves the
//   ranking and redirects back to / with 303.
// - A first choice that overlaps another committed session carries data-clash
//   and names the other course in its visible text.
// Data is the real S2 2026 timetable in src/data/timetable-2026-s2.json.
const baseUrl = inject("baseUrl");

const LAB = "COMP3300-ComA";

// Astro rejects form POSTs without a same-origin Origin header (CSRF check).
const rank = (activity: string, order: string[]) =>
  fetch(new URL("/api/preferences", baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body: new URLSearchParams({ activity, order: order.join(",") }),
    redirect: "manual",
  });

const page = async (): Promise<Document> => {
  const res = await fetch(baseUrl);
  expect(res.status).toBe(200);
  return new JSDOM(await res.text()).window.document;
};

const rankedGroups = (doc: Document, activity: string): string[] =>
  [...doc.querySelectorAll(`[data-activity="${activity}"] [data-group]`)].map(
    (el) => el.getAttribute("data-group") ?? "",
  );

const groupItem = (doc: Document, group: string): Element => {
  const el = doc.querySelector(`[data-group="${group}"]`);
  if (!el) throw new Error(`no [data-group="${group}"] on the page`);
  return el;
};

describe("timetable preferences", () => {
  it("lists every COMP3300 lab group", async () => {
    expect([...rankedGroups(await page(), LAB)].sort()).toEqual([
      `${LAB}-01`,
      `${LAB}-02`,
      `${LAB}-03`,
      `${LAB}-04`,
    ]);
  });

  it("keeps a saved ranking across a reload", async () => {
    const res = await rank(LAB, ["02", "04", "03", "01"]);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");

    expect(rankedGroups(await page(), LAB)).toEqual([
      `${LAB}-02`,
      `${LAB}-04`,
      `${LAB}-03`,
      `${LAB}-01`,
    ]);
  });

  // Lab 01 (Thu 11:00–13:00) overlaps the COMP4020 lecture (Thu 11:00–13:00).
  it("flags a first choice that clashes, and names what it clashes with", async () => {
    await rank(LAB, ["01", "02", "03", "04"]);
    const first = groupItem(await page(), `${LAB}-01`);
    expect(first.hasAttribute("data-clash")).toBe(true);
    expect(first.textContent).toContain("COMP4020");
  });

  // Lab 04 (Fri 15:00–17:00) overlaps nothing else in the timetable.
  it("does not flag a first choice that fits", async () => {
    await rank(LAB, ["04", "01", "02", "03"]);
    expect(groupItem(await page(), `${LAB}-04`).hasAttribute("data-clash")).toBe(false);
  });
});
