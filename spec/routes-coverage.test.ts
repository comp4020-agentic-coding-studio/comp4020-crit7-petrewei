import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, it } from "vitest";
import { ROUTES } from "./routes";

// The invariants and the axe pass only visit spec/routes.ts, so a page missing
// from it is silently unchecked. Every page under src/pages must be listed;
// api/ endpoints and _-prefixed files are not pages. A dynamic page such as
// [id].astro is covered by any listed route its pattern matches.
const PAGES = "src/pages";
const PAGE_FILE = /\.(astro|md|mdx|html)$/;

const pageFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.name.startsWith("_")) return [];
    if (entry.isDirectory()) return relative(PAGES, path) === "api" ? [] : pageFiles(path);
    return PAGE_FILE.test(entry.name) ? [path] : [];
  });

const routePattern = (file: string): RegExp => {
  const path = relative(PAGES, file)
    .replace(PAGE_FILE, "")
    .replace(/(^|\/)index$/, "");
  const segments = path === "" ? [] : path.split("/");
  const pattern = segments
    .map((s) => (s.startsWith("[...") ? ".*" : s.startsWith("[") ? "[^/]+" : s))
    .join("/");
  return new RegExp(`^/${pattern}${pattern ? "/?" : ""}$`);
};

it("lists every page under src/pages in spec/routes.ts", () => {
  const files = pageFiles(PAGES);
  expect(files.length).toBeGreaterThan(0);
  const missing = files.filter((file) => !ROUTES.some((route) => routePattern(file).test(route)));
  expect(missing, `add a route for each of these to spec/routes.ts: ${missing.join(", ")}`).toEqual(
    [],
  );
});
