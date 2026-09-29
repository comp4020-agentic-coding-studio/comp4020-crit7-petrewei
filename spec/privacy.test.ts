import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// The repo goes public at the cutoff. A MyTimetable calendar feed URL grants
// read access to a timetable, and a uni ID identifies a student, so neither may
// sit in any tracked or new file. The patterns are generic, so no real ID
// appears here.
const PERSONAL = /calendar\/ical\/[0-9a-f]{8}-[0-9a-f]{4}-|(^|[^A-Za-z0-9])u[0-9]{7}([^0-9]|$)/m;

it("keeps timetable feed URLs and uni IDs out of the repo", () => {
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter(Boolean);
  const leaks = files.filter((file) => {
    try {
      return PERSONAL.test(readFileSync(file, "utf8"));
    } catch {
      return false; // deleted but still in the index
    }
  });
  expect(leaks, `remove the feed URL or uni ID from: ${leaks.join(", ")}`).toEqual([]);
});
