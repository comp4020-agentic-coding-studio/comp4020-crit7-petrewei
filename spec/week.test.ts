import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, inject, it } from "vitest";

// Contract for "Your week", checked over HTTP against the built app:
// - GET /?week=N shows one Mon–Fri week as [data-week="N"]. Week 1 starts on
//   Monday 27/7 and the last week holds the last meeting date (29/10), so
//   there are 14. Each weekday is [data-date="D/M"] with its [data-slot]s.
// - The week holds every lecture and the allocated group of each lab and
//   tutorial, only on the dates they meet, and follows a recorded allocation.
// - A slot that overlaps another slot on the same date has class slot-clash.
// - Links with rel="prev" and rel="next" go to the neighbouring weeks, and
//   are absent at either end.
// - Without ?week, or with one outside 1–14, the page shows the week holding
//   today's date in Canberra, or the nearest end of the semester.
const baseUrl = inject("baseUrl");

const LAB = "COMP3300-ComA";
const TUT = "COMP4020-TutA";
const LAST_WEEK = 14;

const record = async (activity: string, group: string) => {
  const res = await fetch(new URL("/api/allocation", baseUrl), {
    method: "POST",
    headers: { origin: baseUrl },
    body: new URLSearchParams({ activity, group }),
    redirect: "manual",
  });
  expect(res.status, `recording ${activity} ${group}`).toBe(303);
};

// MyTimetable's allocation: lab 04 and tutorial 03.
beforeEach(async () => {
  await record(LAB, "04");
  await record(TUT, "03");
});

const weekPage = async (query = ""): Promise<Document> => {
  const res = await fetch(new URL(`/${query}`, baseUrl));
  expect(res.status).toBe(200);
  return new JSDOM(await res.text()).window.document;
};

const shownWeek = (doc: Document): number => {
  const weeks = doc.querySelectorAll("[data-week]");
  expect(weeks).toHaveLength(1);
  return Number(weeks[0].getAttribute("data-week"));
};

const slots = (doc: Document, date: string): Element[] => {
  const day = doc.querySelector(`[data-week] [data-date="${date}"]`);
  if (!day) throw new Error(`no [data-date="${date}"] in the week shown`);
  return [...day.querySelectorAll("[data-slot]")];
};

const slotText = (doc: Document, date: string): string[] =>
  slots(doc, date).map((s) => (s.textContent ?? "").replace(/\s+/g, " "));

const allSlotText = (doc: Document): string =>
  [...doc.querySelectorAll("[data-week] [data-slot]")].map((s) => s.textContent).join(" | ");

describe("your week", () => {
  it("dates each weekday of the week asked for", async () => {
    const doc = await weekPage("?week=10");
    expect(shownWeek(doc)).toBe(10);
    const dates = [...doc.querySelectorAll("[data-week] [data-date]")].map((d) =>
      d.getAttribute("data-date"),
    );
    expect(dates).toEqual(["28/9", "29/9", "30/9", "1/10", "2/10"]);
  });

  it("shows the allocated lab and tutorial, and no other group", async () => {
    const doc = await weekPage("?week=2");
    expect(slotText(doc, "7/8").join()).toMatch(/15:00–17:00.*COMP3300 Computer lab group 04/);
    expect(slotText(doc, "5/8").join()).toMatch(/09:00–10:30.*COMP4020 Tutorial group 03/);
    expect(allSlotText(doc)).not.toMatch(/group 0[1256]/);
  });

  it("follows a recorded allocation", async () => {
    await record(LAB, "01");
    const doc = await weekPage("?week=2");
    expect(slotText(doc, "6/8").join()).toMatch(/11:00–13:00.*COMP3300 Computer lab group 01/);
    expect(allSlotText(doc)).not.toContain("group 04");
  });

  // The COMP3500 lecture meets on 30/7 only, and the tutorials start on 5/8.
  it("shows only the meetings on that week's dates", async () => {
    const first = await weekPage("?week=1");
    expect(slotText(first, "30/7").join()).toContain("COMP3500");
    expect(allSlotText(first)).not.toContain("Tutorial");

    const second = await weekPage("?week=2");
    expect(allSlotText(second)).not.toContain("COMP3500");
    expect(slotText(second, "6/8").join()).toContain("COMP4020 Lecture");
  });

  // Thu 30/7: COMP3500 10:00–12:00 overlaps COMP4020 11:00–13:00. A week
  // later the COMP4020 lecture is alone.
  it("marks a clash only in the week it happens", async () => {
    const clashing = (doc: Document, date: string) =>
      slots(doc, date).map((s) => s.classList.contains("slot-clash"));
    expect(clashing(await weekPage("?week=1"), "30/7")).toEqual([true, true]);
    expect(clashing(await weekPage("?week=2"), "6/8")).toEqual([false]);
  });

  it("links to the previous and next weeks, and stops at either end", async () => {
    const link = (doc: Document, rel: string) =>
      doc.querySelector(`a[rel="${rel}"]`)?.getAttribute("href") ?? null;

    const middle = await weekPage("?week=2");
    expect(link(middle, "prev")).toBe("/?week=1");
    expect(link(middle, "next")).toBe("/?week=3");

    expect(link(await weekPage("?week=1"), "prev")).toBeNull();
    expect(link(await weekPage(`?week=${LAST_WEEK}`), "next")).toBeNull();
  });

  it.each(["", "?week=0", "?week=99", "?week=abc"])(
    "opens %s on the week holding today in Canberra",
    async (query) => {
      expect(shownWeek(await weekPage(query))).toBe(currentWeek());
    },
  );
});

// Week 1 starts on Monday 27 July 2026, day 208 of the year. Today's date is
// read in Canberra's time zone, as calendar parts rather than a timestamp.
function currentWeek(): number {
  const parts = new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Sydney",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const today = Date.UTC(part("year"), part("month") - 1, part("day"));
  const weekOne = Date.UTC(2026, 6, 27);
  const week = Math.floor((today - weekOne) / (7 * 86_400_000)) + 1;
  return Math.min(Math.max(week, 1), LAST_WEEK);
}
