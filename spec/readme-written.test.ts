import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

// /readme/ is the first thing a marker reads, and spec/readme.test.ts passes on
// the starter's template because its instructions sit in an HTML comment that
// never renders. pnpm check:evidence only looks for the template in PROCESS.md.
const readme = readFileSync("README.md", "utf8");

it("replaces the template README", () => {
  expect(readme, "README.md still has the template comment").not.toContain("TEMPLATE:");
  expect(readme, "README.md still has the template's placeholder text").not.toContain(
    "What this is, in a paragraph",
  );
});
