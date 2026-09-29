import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it } from "vitest";
import { COURSE_TITLES_ZH } from "../src/lib/i18n";
import { allocatedOf, baseUrl, groupsOf, LAB, page, post, record, restoreAllocation, TUT } from "./app";

// Contract for the Simplified Chinese pages, checked over HTTP:
// - /zh/ is the timetable and /zh/readme/ the About page, in zh-CN. Each page's
//   header links to its counterpart in the other language, keeping ?week.
// - Words are translated: course titles, activity kinds, meeting types,
//   weekdays and every label on the page. Codes are not: course codes,
//   activity codes such as LecA and 01-P2, group labels, times and dates, and
//   the rooms and lecturers as MyTimetable names them.
// - The zh form posts the same fields plus locale=zh, and the 303 goes back to
//   /zh/?week=N. Any other locale value redirects as the English form does.
// - /zh/readme/ carries the whole of README.zh-CN.md.
type Timetable = {
  courses: {
    code: string;
    activities: { groups: { meetings: { location: string; staff: string | null }[] }[] }[];
  }[];
};
const timetable: Timetable = JSON.parse(readFileSync("src/data/timetable-2026-s2.json", "utf8"));

const squash = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();

beforeEach(restoreAllocation);

describe("Simplified Chinese timetable", () => {
  it("declares zh-CN and lists the same groups as the English page", async () => {
    const [zh, en] = await Promise.all([page("/zh/"), page("/")]);
    expect(zh.documentElement.lang).toBe("zh-CN");
    expect(groupsOf(zh, LAB)).toEqual(groupsOf(en, LAB));
    expect(groupsOf(zh, TUT)).toEqual(groupsOf(en, TUT));
    expect(allocatedOf(zh, LAB)).toEqual([`${LAB}-04`]);
  });

  it("translates course titles and labels and keeps the codes", async () => {
    const doc = await page("/zh/");
    const inActivity = (activity: string, selector: string) =>
      squash(doc.querySelector(`[data-activity="${activity}"] ${selector}`)?.textContent);
    expect(inActivity(LAB, "h2")).toBe("COMP3300 计算机实验课");
    expect(inActivity(LAB, ".course")).toBe("操作系统实现");
    expect(inActivity(TUT, "h2")).toBe("COMP4020 辅导课");
    expect(inActivity(TUT, ".course")).toBe("以人为本的智能体编程工作室高级专题");

    const buttons = ["01", "04"].map((g) => {
      const card = doc.querySelector(`[data-group="${LAB}-${g}"]`);
      const button = card?.querySelector("button");
      return [squash(card?.querySelector(".group-name")?.textContent), squash(button?.textContent), button?.value];
    });
    expect(buttons).toEqual([
      ["第 01 组", "分配", "01"],
      ["第 04 组", "已分配", "04"],
    ]);

    const tut01 = doc.querySelector(`[data-group="${TUT}-01"]`);
    expect([...(tut01?.querySelectorAll(":scope > .when") ?? [])].map((el) => squash(el.textContent))).toEqual([
      "周一 14:00–15:30",
    ]);
    expect(squash(tut01?.querySelector("details")?.textContent)).toMatch(
      /^详情\s*辅导课 01-P1.*辅导补课 01-P2\s*周二 14:00–15:30，\s*仅 6\/10\s*Rm 4\.03_Marie Reay Bldg 155$/,
    );
  });

  // Week 1 has the COMP3500 and COMP4020 lectures clashing on Thu 30/7, and
  // week 11 tutorial 01's Labour Day makeup, so between them every label shows.
  it.each(["1", "11"])("leaves no English word in week %s but codes, rooms and lecturers", async (week) => {
    await record(TUT, "01");
    const doc = await page(`/zh/?week=${week}`);
    let text = squash(doc.querySelector("main")?.textContent);
    expect(text).toContain("第 " + week + " 周");
    if (week === "1") expect(text).toMatch(/COMP3500 讲座（LecA）.*冲突/);
    if (week === "11") expect(text).toContain("辅导补课");

    const names = timetable.courses.flatMap((c) =>
      c.activities.flatMap((a) => a.groups.flatMap((g) => g.meetings.flatMap((m) => [m.location, m.staff ?? ""]))),
    );
    for (const name of names.filter(Boolean)) text = text.replaceAll(name, "");
    const codes = /COMP\d{4}|\b(Lec|Com|Tut)[A-Z]\b/g;
    expect(text.replace(codes, "").match(/[A-Za-z]{2,}/g)).toBeNull();
  });

  it("returns a zh form submission to the Chinese week being viewed", async () => {
    const form = [...(await page("/zh/?week=3")).forms].find(
      (f) => (f.elements.namedItem("activity") as HTMLInputElement | null)?.value === TUT,
    );
    if (!form) throw new Error(`no form on /zh/ for ${TUT}`);
    const submitter = [...form.querySelectorAll("button")].find((b) => b.value === "01");
    const data = new form.ownerDocument.defaultView!.FormData(form, submitter);
    const body = new URLSearchParams([...data].map(([name, value]) => [name, String(value)]));
    expect([...body].sort()).toEqual([
      ["activity", TUT],
      ["group", "01"],
      ["locale", "zh"],
      ["week", "3"],
    ]);

    const res = await post(body);
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("/zh/?week=3");
    const monday = (await page("/zh/?week=3")).querySelector('[data-week] [data-date="10/8"]');
    expect(squash(monday?.textContent)).toMatch(/^周一 10\/8.*14:00–15:30\s*COMP4020 辅导课 第 01 组/);
  });

  it("redirects an unknown locale as the English form does", async () => {
    const res = await post(new URLSearchParams({ activity: LAB, group: "04", locale: "//example.com", week: "2" }));
    expect(res.headers.get("location")).toBe("/?week=2");
  });

  it("has a Chinese title for every course in the MyTimetable copy", () => {
    expect(timetable.courses.map((c) => c.code).filter((code) => !COURSE_TITLES_ZH[code])).toEqual([]);
  });
});

describe("language switch", () => {
  it.each([
    ["/", "/zh/", "zh-CN"],
    ["/?week=3", "/zh/?week=3", "zh-CN"],
    ["/readme/", "/zh/readme/", "zh-CN"],
    ["/zh/", "/", "en-AU"],
    ["/zh/readme/", "/readme/", "en-AU"],
  ])("links %s to %s", async (from, to, hreflang) => {
    const link = (await page(from)).querySelector(`header a[hreflang="${hreflang}"]`);
    expect(link?.getAttribute("href")).toBe(to);
    expect(link?.getAttribute("lang")).toBe(hreflang);
  });

  it("keeps the Chinese pages' own links in Chinese", async () => {
    const nav = (await page("/zh/readme/")).querySelector('header nav[aria-label="网站"]');
    const links = [...(nav?.querySelectorAll("a") ?? [])].map((a) => [squash(a.textContent), a.getAttribute("href")]);
    expect(links).toEqual([
      ["课表", "/zh/"],
      ["关于", "/zh/readme/"],
      ["English", "/readme/"],
    ]);
  });
});

describe("Chinese About page", () => {
  // As spec/readme.test.ts does for README.md: letters and digits only.
  const normalise = (s: string): string => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");

  it("serves the whole of README.zh-CN.md at /zh/readme/", async () => {
    const processor = await createMarkdownProcessor();
    const html = (await processor.render(readFileSync("README.zh-CN.md", "utf8"))).code;
    const expected = normalise(new JSDOM(html).window.document.body.textContent ?? "");
    expect(expected.match(/\p{Script=Han}/gu)?.length ?? 0, "README.zh-CN.md is not in Chinese").toBeGreaterThan(200);

    const doc = await page("/zh/readme/");
    expect(doc.documentElement.lang).toBe("zh-CN");
    expect(normalise(doc.body.textContent ?? "").includes(expected)).toBe(true);
  });
});
