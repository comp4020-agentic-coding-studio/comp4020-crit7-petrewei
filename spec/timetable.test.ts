import { JSDOM } from "jsdom";
import { afterAll, describe, expect, inject, it } from "vitest";

// Contract for the allocation page, checked over HTTP against the built app:
// - GET / lists each lab and tutorial as [data-activity="COURSE-ACT"], holding
//   its groups as [data-group="COURSE-ACT-NN"] in label order, 01 first. The
//   allocated group, and only that one, carries data-allocated.
// - POST /api/allocation with activity=COURSE-ACT and group=NN records the
//   allocation and redirects back to / with 303.
// - The page's own form for an activity submits those two fields, so the form
//   and the handler cannot drift apart while direct POSTs stay green. It works
//   without JavaScript: a button named `group` carries the group. The form also
//   carries the week shown, and the 303 goes back to /?week=N, so the week
//   being viewed shows the new allocation.
// - A card shows a group's regular meeting times. A one-off replacement, such
//   as a tutorial moved for a public holiday, is listed only in its details.
// - The server rejects an unknown activity, a lecture, or a group the activity
//   does not have with a 4xx, and the recorded allocation is unchanged.
// - Clashes are shown only in the week calendar, on the date they happen
//   (spec/week.test.ts), so no group in the list is flagged or names a clash.
// Data is the real S2 2026 timetable in src/data/timetable-2026-s2.json.
const baseUrl = inject("baseUrl");

const LAB = "COMP3300-ComA";
const TUT = "COMP4020-TutA";

// Astro rejects form POSTs without a same-origin Origin header (CSRF check).
const record = (activity: string, group: string) =>
  fetch(new URL("/api/allocation", baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body: new URLSearchParams({ activity, group }),
    redirect: "manual",
  });

// An allocation the test depends on, so a failed save fails here.
const setAllocation = async (activity: string, group: string) => {
  const res = await record(activity, group);
  expect(res.status, `setting up ${activity}`).toBe(303);
};

const page = async (): Promise<Document> => {
  const res = await fetch(baseUrl);
  expect(res.status).toBe(200);
  return new JSDOM(await res.text()).window.document;
};

const groupsOf = (doc: Document, activity: string): string[] =>
  [...doc.querySelectorAll(`[data-activity="${activity}"] [data-group]`)].map(
    (el) => el.getAttribute("data-group") ?? "",
  );

const allocatedOf = (doc: Document, activity: string): string[] =>
  [...doc.querySelectorAll(`[data-activity="${activity}"] [data-group][data-allocated]`)].map(
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

// Leave MyTimetable's allocation in place for the other spec files.
afterAll(async () => {
  await setAllocation(LAB, "04");
  await setAllocation(TUT, "03");
});

describe("allocation", () => {
  it("lists each activity's groups in label order", async () => {
    const doc = await page();
    expect(groupsOf(doc, LAB)).toEqual(["01", "02", "03", "04"].map((g) => `${LAB}-${g}`));
    expect(groupsOf(doc, TUT)).toEqual(["01", "02", "03", "04", "05", "06"].map((g) => `${TUT}-${g}`));
  });

  it("keeps a recorded allocation across a reload, in the same order", async () => {
    const res = await record(LAB, "02");
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");
    await setAllocation(TUT, "05");

    const doc = await page();
    expect(allocatedOf(doc, LAB)).toEqual([`${LAB}-02`]);
    expect(allocatedOf(doc, TUT)).toEqual([`${TUT}-05`]);
    expect(groupsOf(doc, LAB)[0]).toBe(`${LAB}-01`);
  });

  // A renamed field in the form would lose allocations while the direct POSTs
  // above stay green (Lecture 7), so submit the page's own form.
  it("records an allocation submitted through the page's own form", async () => {
    await setAllocation(LAB, "04");
    const doc = await page();
    const form = formFor(doc, LAB);
    expect(form.getAttribute("method")?.toLowerCase()).toBe("post");
    expect(new URL(form.action, baseUrl).pathname).toBe("/api/allocation");

    // Without JavaScript, a button named `group` must carry another group.
    const submitter = [...form.querySelectorAll("button")].find(
      (b) => b.name === "group" && b.value === "03",
    );
    if (!submitter) throw new Error("no button named `group` with the value 03");
    const data = formData(form, submitter);
    expect(data.get("activity")).toBe(LAB);
    expect(data.getAll("group")).toEqual(["03"]);

    const res = await fetch(new URL("/api/allocation", baseUrl), {
      method: "POST",
      headers: { origin: baseUrl },
      body: data,
      redirect: "manual",
    });
    expect(res.status).toBe(303);
    expect(allocatedOf(await page(), LAB)).toEqual([`${LAB}-03`]);
  });

  it("returns to the week being viewed, showing the new allocation", async () => {
    await setAllocation(TUT, "03");
    const res0 = await fetch(new URL("/?week=3", baseUrl));
    const doc = new JSDOM(await res0.text()).window.document;
    const form = formFor(doc, TUT);
    const submitter = [...form.querySelectorAll("button")].find((b) => b.name === "group" && b.value === "01");
    if (!submitter) throw new Error("no button named `group` with the value 01");

    const res = await fetch(new URL("/api/allocation", baseUrl), {
      method: "POST",
      headers: { origin: baseUrl },
      body: formData(form, submitter),
      redirect: "manual",
    });
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/?week=3");

    const after = await fetch(new URL(res.headers.get("location")!, baseUrl));
    const week = new JSDOM(await after.text()).window.document;
    expect(week.querySelector("[data-week]")?.getAttribute("data-week")).toBe("3");
    const monday = week.querySelector('[data-week] [data-date="10/8"]')?.textContent ?? "";
    expect(monday.replace(/\s+/g, " ")).toMatch(/14:00–15:30.*COMP4020 Tutorial group 01/);
  });

  // Tutorial 01 meets on Mondays, and on Tue 6/10 in week 9 for Labour Day.
  it("shows only a group's regular times on its card", async () => {
    const card = groupItem(await page(), `${TUT}-01`);
    const times = [...card.querySelectorAll(":scope > .when")].map((el) => el.textContent?.trim());
    expect(times).toEqual(["Mon 14:00–15:30"]);
    expect(card.querySelector("details")?.textContent).toMatch(/Tue 14:00–15:30.*6\/10 only/s);
  });

  it.each([
    ["a group that does not exist", LAB, "09"],
    ["a missing group", LAB, ""],
    // A lecture has one group, so there is nothing to record.
    ["a lecture", "COMP3300-LecA", "01"],
    // A valid lab group, so only the activity name can make this fail.
    ["an unknown activity", "COMP9999-ComA", "01"],
  ])("rejects %s and keeps the recorded allocation", async (_label, activity, group) => {
    await setAllocation(LAB, "02");
    const res = await record(activity, group);
    expect(res.status, `status ${res.status}`).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(allocatedOf(await page(), LAB)).toEqual([`${LAB}-02`]);
  });

  it("rejects a body that is not a form", async () => {
    const res = await fetch(new URL("/api/allocation", baseUrl), {
      method: "POST",
      headers: { origin: baseUrl, "content-type": "application/json" },
      body: JSON.stringify({ activity: LAB, group: "01" }),
      redirect: "manual",
    });
    expect(res.status).toBe(400);
  });

  // Lab 01 (Thu 11:00–13:00) overlaps the COMP4020 lecture every Thursday, but
  // Peter wants a clash shown only in the week it happens.
  it("does not flag a clashing allocated group in the list", async () => {
    await setAllocation(LAB, "01");
    const doc = await page();
    expect(allocatedOf(doc, LAB)).toEqual([`${LAB}-01`]);
    expect(doc.querySelectorAll("[data-activity] [data-clash]")).toHaveLength(0);
    const list = [...doc.querySelectorAll("[data-activity]")].map((el) => el.textContent).join(" ");
    expect(list).toContain("Group 01");
    expect(list).not.toMatch(/clash/i);
  });
});
