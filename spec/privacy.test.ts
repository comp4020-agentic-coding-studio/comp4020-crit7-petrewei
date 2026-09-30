import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// The repo goes public at the cutoff. A MyTimetable calendar feed URL grants
// read access to a timetable, and a uni ID or an ANU email identifies a
// student, so none may sit in any tracked or new file, and the screenshots the
// browser tool takes stay untracked. The patterns are generic, so no real ID
// appears here.
const PERSONAL = new RegExp(
  [
    "calendar/ical/[0-9a-f]{8}-[0-9a-f]{4}-",
    "webcal:" + "//",
    "(^|[^A-Za-z0-9])u[0-9]{7}([^0-9]|$)",
    "[A-Za-z0-9._%+-]+@(student\\.)?anu\\.edu\\.au",
  ].join("|"),
  "im",
);

it("recognises each kind of personal detail", () => {
  const samples = [
    ["a feed URL", "https://example.org/calendar/" + "ical/0123abcd-4567-89ef"],
    ["a webcal URL", "webcal:" + "//example.org/feed"],
    ["a uni ID", "id: u" + "1234567"],
    ["a capital uni ID", "ID U" + "1234567."],
    ["an email", "mail " + "someone" + "@" + "anu.edu.au"],
    ["a student email", "someone" + "@student." + "anu.edu.au"],
  ];
  expect(samples.filter(([, text]) => !PERSONAL.test(text)).map(([what]) => what)).toEqual([]);
  expect(PERSONAL.test("Group 01, week 12345678 of 2026")).toBe(false);
});

it("keeps timetable feed URLs, uni IDs and ANU emails out of the repo", () => {
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  const leaks = files.filter((file) => {
    try {
      return PERSONAL.test(readFileSync(file, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return false; // deleted but still in the index
      throw error;
    }
  });
  expect(leaks, `remove the feed URL, uni ID or email from: ${leaks.join(", ")}`).toEqual([]);
});

it("ignores the browser tool's screenshots, so they cannot be staged", () => {
  const ignored = execFileSync("git", ["check-ignore", ".playwright-mcp/page.png"], { encoding: "utf8" });
  expect(ignored.trim()).toBe(".playwright-mcp/page.png");
});
