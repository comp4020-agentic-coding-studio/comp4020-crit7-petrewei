import { JSDOM } from "jsdom";
import { describe, expect, inject, it } from "vitest";

// Contract for the preference page, checked over HTTP against the built app:
// - GET / lists each choosable activity as [data-activity="COURSE-ACT"], holding
//   its groups as [data-group="COURSE-ACT-NN"] in rank order, first choice first.
// - POST /api/preferences with activity=COURSE-ACT and order=NN,NN,... saves the
//   ranking and redirects back to / with 303.
// - The page's own form for an activity submits exactly those two fields, so the
//   form and the handler cannot drift apart while direct POSTs stay green. It
//   works without JavaScript: a button named `order` carries the new ranking.
// - The server rejects an unknown activity or an order that is not exactly the
//   activity's groups with a 4xx, and the saved ranking is unchanged.
// - A first choice that overlaps another committed session carries data-clash
//   and names every course it clashes with in its visible text.
// Data is the real S2 2026 timetable in src/data/timetable-2026-s2.json.
const baseUrl = inject("baseUrl");

const LAB = "COMP3300-ComA";
const TUT = "COMP4020-TutA";

// Astro rejects form POSTs without a same-origin Origin header (CSRF check).
const rank = (activity: string, order: string[]) =>
  fetch(new URL("/api/preferences", baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body: new URLSearchParams({ activity, order: order.join(",") }),
    redirect: "manual",
  });

// A ranking the test depends on, so a failed save fails here.
const setRanking = async (activity: string, order: string[]) => {
  const res = await rank(activity, order);
  expect(res.status, `setting up ${activity}`).toBe(303);
};

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

// The form whose `activity` field holds this activity, as a browser sees it.
const formFor = (doc: Document, activity: string): HTMLFormElement => {
  const form = [...doc.forms].find(
    (f) => (f.elements.namedItem("activity") as HTMLInputElement | null)?.value === activity,
  );
  if (!form) throw new Error(`no form on / with a field activity="${activity}"`);
  return form;
};

// What a browser sends when `submitter` is pressed, urlencoded as a form is.
const formData = (form: HTMLFormElement, submitter: HTMLButtonElement): URLSearchParams => {
  const data = new form.ownerDocument.defaultView!.FormData(form, submitter);
  return new URLSearchParams([...data].map(([name, value]) => [name, String(value)]));
};

describe("timetable preferences", () => {
  it("keeps a saved ranking across a reload", async () => {
    const res = await rank(LAB, ["02", "04", "03", "01"]);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");
    await setRanking(TUT, ["06", "05", "04", "03", "02", "01"]);

    const doc = await page();
    expect(rankedGroups(doc, LAB)).toEqual([`${LAB}-02`, `${LAB}-04`, `${LAB}-03`, `${LAB}-01`]);
    expect(rankedGroups(doc, TUT)).toEqual(
      ["06", "05", "04", "03", "02", "01"].map((g) => `${TUT}-${g}`),
    );
  });

  // A renamed field in the form would lose rankings while the direct POSTs
  // above stay green (Lecture 7), so submit the page's own form.
  it("saves a ranking submitted through the page's own form", async () => {
    await setRanking(LAB, ["01", "02", "03", "04"]);
    const doc = await page();
    const form = formFor(doc, LAB);
    expect(form.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(new URL(form.action, baseUrl).pathname).toBe("/api/preferences");

    // Without JavaScript, a button named `order` must carry a new ranking.
    const current = rankedGroups(doc, LAB).map((g) => g.slice(LAB.length + 1)).join(",");
    const submitter = [...form.querySelectorAll("button")].find(
      (b) => b.name === "order" && b.value !== current,
    );
    if (!submitter) throw new Error("no button named `order` that changes the ranking");
    const data = formData(form, submitter);
    expect(data.get("activity")).toBe(LAB);
    expect(data.getAll("order")).toEqual([submitter.value]);

    const res = await fetch(new URL("/api/preferences", baseUrl), {
      method: "POST",
      headers: { origin: baseUrl },
      body: data,
      redirect: "manual",
    });
    expect(res.status).toBe(303);
    expect(rankedGroups(await page(), LAB)).toEqual(
      submitter.value.split(",").map((g) => `${LAB}-${g}`),
    );
  });

  it.each([
    ["a repeated group", LAB, ["01", "01", "02", "03"]],
    ["a missing group", LAB, ["01", "02", "03"]],
    ["a group that does not exist", LAB, ["01", "02", "03", "09"]],
    // A valid lab order, so only the activity name can make this fail.
    ["an unknown activity", "COMP9999-ComA", ["01", "02", "03", "04"]],
  ])("rejects %s and keeps the saved ranking", async (_label, activity, order) => {
    await setRanking(LAB, ["03", "01", "04", "02"]);
    const res = await rank(activity, order);
    expect(res.status, `status ${res.status}`).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(rankedGroups(await page(), LAB)).toEqual([
      `${LAB}-03`,
      `${LAB}-01`,
      `${LAB}-04`,
      `${LAB}-02`,
    ]);
  });

  it("rejects a body that is not a form", async () => {
    const res = await fetch(new URL("/api/preferences", baseUrl), {
      method: "POST",
      headers: { origin: baseUrl, "content-type": "application/json" },
      body: JSON.stringify({ activity: LAB, order: "01,02,03,04" }),
      redirect: "manual",
    });
    expect(res.status).toBe(400);
  });

  // Lab 01 (Thu 11:00–13:00) overlaps the COMP4020 lecture (Thu 11:00–13:00)
  // and the one-off COMP3500 lecture (Thu 10:00–12:00, 30/7 only).
  it("flags a first choice that clashes, and names what it clashes with", async () => {
    await setRanking(LAB, ["01", "02", "03", "04"]);
    await setRanking(TUT, ["03", "01", "02", "04", "05", "06"]);
    const doc = await page();
    const first = groupItem(doc, `${LAB}-01`);
    expect(first.hasAttribute("data-clash")).toBe(true);
    expect(first.textContent).toContain("COMP4020");
    expect(first.textContent).toContain("COMP3500");
    expect(doc.querySelectorAll("[data-clash]")).toHaveLength(1);
  });

  // Lab 04 (Fri 15:00–17:00) overlaps nothing, and only first choices are
  // compared, so lab 01 ranked second is no longer flagged either.
  it("does not flag a first choice that fits, or a clashing group ranked lower", async () => {
    await setRanking(LAB, ["04", "01", "02", "03"]);
    const doc = await page();
    expect(groupItem(doc, `${LAB}-04`).hasAttribute("data-clash")).toBe(false);
    expect(groupItem(doc, `${LAB}-01`).hasAttribute("data-clash")).toBe(false);
  });
});
