import { beforeEach, describe, expect, it } from "vitest";
import { allocatedOf, baseUrl, groupsOf, LAB, page, post, record, restoreAllocation, squash, TUT } from "./app";

// Contract for the allocation page, checked over HTTP against the built app:
// - GET / lists each lab and tutorial as [data-activity="COURSE-ACT"], holding
//   its groups as [data-group="COURSE-ACT-NN"] (spec/sessions.test.ts checks
//   which, in label order). The allocated group, and only that one, carries
//   data-allocated.
// - POST /api/allocation with activity=COURSE-ACT and group=NN records the
//   allocation and redirects back to / with 303.
// - The page's own form for an activity submits those two fields, so the form
//   and the handler cannot drift apart while direct POSTs stay green. It works
//   without JavaScript: an Allocate button named `group` beside each group's
//   name carries the group, and the allocated group's is a disabled Allocated
//   button. The form also carries the week shown, and the 303 goes back to
//   /?week=N, so the week being viewed shows the new allocation.
// - A card shows a group's regular meeting times. A one-off replacement, such
//   as a tutorial moved for a public holiday, is listed only in its details.
// - Each activity is headed by its course code and kind, with "Computer lab"
//   reading "Lab", and names its course by title only. A card's details give
//   each meeting's MyTimetable type and activity code, such as
//   "Tutorial Makeup 01-P2", except that "Computer Laboratory" reads "Laboratory",
//   and its room and building on separate lines where MyTimetable joins them
//   with "_".
// - Each COMP4020 tutorial card gives its group's name, right of the group
//   number in the card's head, and its tutor, from the
//   course website's tutorial list, and no other card names either.
// - The server rejects an unknown activity, a lecture, or a group the activity
//   does not have with a 4xx, and the recorded allocation is unchanged.
// - Clashes are shown only in the week calendar, on the date they happen
//   (spec/week.test.ts), so no group in the list is flagged or names a clash.
// Data is the real S2 2026 timetable in src/data/timetable-2026-s2.json.

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

beforeEach(restoreAllocation);

describe("allocation", () => {
  it("keeps a recorded allocation across a reload, in the same order", async () => {
    const res = await post(new URLSearchParams({ activity: LAB, group: "02" }));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/");
    await record(TUT, "05");

    const doc = await page();
    expect(allocatedOf(doc, LAB)).toEqual([`${LAB}-02`]);
    expect(allocatedOf(doc, TUT)).toEqual([`${TUT}-05`]);
    expect(groupsOf(doc, LAB)).toEqual(["01", "02", "03", "04"].map((g) => `${LAB}-${g}`));
  });

  // A renamed field in the form would lose allocations while the direct POSTs
  // above stay green (Lecture 7), so submit the page's own form, as a browser
  // without JavaScript does when group 01's button is pressed.
  it("records a group through the page's own form and returns to the week being viewed", async () => {
    const form = formFor(await page("/?week=3"), TUT);
    expect(form.method).toBe("post");
    expect(new URL(form.action, baseUrl).pathname).toBe("/api/allocation");
    const submitter = [...form.querySelectorAll("button")].find((b) => b.name === "group" && b.value === "01");
    if (!submitter) throw new Error("no button named `group` with the value 01");

    const data = new form.ownerDocument.defaultView!.FormData(form, submitter);
    const body = new URLSearchParams([...data].map(([name, value]) => [name, String(value)]));
    expect([...body].sort()).toEqual([
      ["activity", TUT],
      ["group", "01"],
      ["week", "3"],
    ]);

    const res = await post(body);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/?week=3");

    const after = await page(res.headers.get("location")!);
    expect(allocatedOf(after, TUT)).toEqual([`${TUT}-01`]);
    expect(after.querySelector("[data-week]")?.getAttribute("data-week")).toBe("3");
    const monday = after.querySelector('[data-week] [data-date="10/8"]')?.textContent ?? "";
    expect(monday.replace(/\s+/g, " ")).toMatch(/14:00–15:30.*COMP4020 Tutorial group 01/);
  });

  // Tutorial 01 meets on Mondays, and on Tue 6/10 in week 11 for Labour Day.
  it("shows only a group's regular times on its card", async () => {
    const card = groupItem(await page(), `${TUT}-01`);
    const times = [...card.querySelectorAll(":scope > .when")].map((el) => el.textContent?.trim());
    expect(times).toEqual(["Mon 14:00–15:30"]);
    expect(card.querySelector("details")?.textContent).toMatch(/Tue 14:00–15:30.*6\/10 only/s);
  });

  // Booleans and strings only: printing a jsdom element in a failure throws.
  it("puts Allocate beside each group's name, and a disabled Allocated on the allocated one", async () => {
    const doc = await page();
    const buttons = ["01", "02", "03", "04"].map((g) => {
      const card = groupItem(doc, `${LAB}-${g}`);
      const all = card.querySelectorAll("button");
      const button = card.querySelector<HTMLButtonElement>(".card-head button");
      if (all.length !== 1 || all[0] !== button) throw new Error(`group ${g} needs one button, beside its name`);
      return [button.textContent?.trim(), button.name, button.value, button.disabled];
    });
    expect(buttons).toEqual([
      ["Allocate", "group", "01", false],
      ["Allocate", "group", "02", false],
      ["Allocate", "group", "03", false],
      ["Allocated", "group", "04", true],
    ]);
  });

  it("names each activity's course by its title alone", async () => {
    const doc = await page();
    const course = (activity: string) =>
      squash(doc.querySelector(`[data-activity="${activity}"] .course`)?.textContent);
    expect(course(LAB)).toBe("Operating Systems Implementation");
    expect(squash(doc.querySelector(`[data-activity="${LAB}"] h2`)?.textContent)).toBe("COMP3300 Lab");
    expect(course(TUT)).toBe("Advanced Topics in Human-Centred Agentic Coding Studio");
  });

  it("gives each meeting's type and activity code in the card's details", async () => {
    const doc = await page();
    const details = (group: string) =>
      squash(groupItem(doc, group).querySelector("details")?.textContent);
    expect(details(`${LAB}-04`)).toContain("Laboratory 04");
    expect(details(`${LAB}-04`)).not.toContain("Computer");
    expect(details(`${TUT}-01`)).toMatch(/Tutorial 01-P1.*Tutorial Makeup 01-P2/);
    expect(details(`${TUT}-03`)).toContain("Tutorial 03");
  });

  it("puts a meeting's room and building on separate lines", async () => {
    const doc = await page();
    const lines = [...groupItem(doc, `${LAB}-01`).querySelectorAll(".meetings li > span")].map((el) => squash(el.textContent));
    expect(lines.slice(-2)).toEqual(["Comp Lab 1.24", "Hanna Neumann Bldg 145"]);
    expect(doc.querySelector("main")?.textContent).not.toContain("_");
  });

  it("gives each COMP4020 tutorial card its group's name and tutor", async () => {
    const doc = await page();
    const line = (group: string, selector: string) =>
      squash(groupItem(doc, group).querySelector(selector)?.textContent);
    const tutorials = ["01", "02", "03", "04", "05", "06"].map((g) => [
      line(`${TUT}-${g}`, ".team"),
      line(`${TUT}-${g}`, ".tutor"),
    ]);
    expect(tutorials).toEqual([
      ["Shítāo", "Tutor: Ushini Attanayake"],
      ["Bādà", "Tutor: Ushini Attanayake"],
      ["Báishí", "Tutor: Tom Griffiths"],
      ["Dàchī", "Tutor: Tom Griffiths"],
      ["Yúnlín", "Tutor: Bill McAlister"],
      ["Liùrú", "Tutor: Bill McAlister"],
    ]);
    expect(doc.querySelectorAll(`[data-activity="${TUT}"] .card-head .group-name + .team`)).toHaveLength(6);
    expect(squash(groupItem(doc, `${TUT}-01`).querySelector(".group-title")?.textContent)).toBe("Group 01 Shítāo");
    expect(doc.querySelectorAll(`[data-activity="${LAB}"] :is(.team, .tutor)`)).toHaveLength(0);
  });

  it.each([
    ["a group that does not exist", LAB, "09"],
    // A lecture has one group, so there is nothing to record.
    ["a lecture", "COMP3300-LecA", "01"],
    // A valid lab group, so only the activity name can make this fail.
    ["an unknown activity", "COMP9999-ComA", "01"],
  ])("rejects %s and keeps the recorded allocation", async (_label, activity, group) => {
    const res = await post(new URLSearchParams({ activity, group }));
    expect(res.status, `status ${res.status}`).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
    expect(allocatedOf(await page(), LAB)).toEqual([`${LAB}-04`]);
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
    await record(LAB, "01");
    const doc = await page();
    expect(allocatedOf(doc, LAB)).toEqual([`${LAB}-01`]);
    expect(doc.querySelectorAll("[data-activity] [data-clash]")).toHaveLength(0);
    const list = [...doc.querySelectorAll("[data-activity]")].map((el) => el.textContent).join(" ");
    expect(list).toContain("Group 01");
    expect(list).not.toMatch(/clash/i);
  });
});
