import { JSDOM } from "jsdom";
import { afterAll, describe, expect, inject, it } from "vitest";

// Contract for the allocation page, checked over HTTP against the built app:
// - GET / lists each lab and tutorial as [data-activity="COURSE-ACT"], holding
//   its groups as [data-group="COURSE-ACT-NN"] in label order, 01 first. The
//   allocated group, and only that one, carries data-allocated.
// - POST /api/allocation with activity=COURSE-ACT and group=NN records the
//   allocation and redirects back to / with 303.
// - The page's own form for an activity submits exactly those two fields, so the
//   form and the handler cannot drift apart while direct POSTs stay green. It
//   works without JavaScript: a button named `group` carries the group.
// - The server rejects an unknown activity, a lecture, or a group the activity
//   does not have with a 4xx, and the recorded allocation is unchanged.
// - An allocated group that overlaps a lecture or another allocated group
//   carries data-clash and names every course it clashes with in its text.
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

  // Lab 01 (Thu 11:00–13:00) overlaps the COMP4020 lecture (Thu 11:00–13:00)
  // and the one-off COMP3500 lecture (Thu 10:00–12:00, 30/7 only).
  it("flags an allocated group that clashes, and names what it clashes with", async () => {
    await setAllocation(LAB, "01");
    await setAllocation(TUT, "03");
    const doc = await page();
    const lab = groupItem(doc, `${LAB}-01`);
    expect(lab.hasAttribute("data-clash")).toBe(true);
    expect(lab.textContent).toContain("COMP4020");
    expect(lab.textContent).toContain("COMP3500");
    expect(doc.querySelectorAll("[data-clash]")).toHaveLength(1);
  });

  // Lab 04 (Fri 15:00–17:00) overlaps nothing, and only allocated groups are
  // compared, so lab 01 is no longer flagged either.
  it("does not flag an allocated group that fits, or a clashing group not allocated", async () => {
    await setAllocation(LAB, "04");
    await setAllocation(TUT, "03");
    const doc = await page();
    expect(groupItem(doc, `${LAB}-04`).hasAttribute("data-clash")).toBe(false);
    expect(groupItem(doc, `${LAB}-01`).hasAttribute("data-clash")).toBe(false);
  });
});
