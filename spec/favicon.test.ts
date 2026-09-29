import { JSDOM } from "jsdom";
import { expect, inject, it } from "vitest";
import { ROUTES } from "./routes";

// Every page links one icon, and the server serves it as an image, so the
// browser tab shows it instead of a blank or a 404.
const baseUrl = inject("baseUrl");

it.each(ROUTES)("links %s to an icon the server serves", async (route) => {
  const res = await fetch(new URL(route, baseUrl));
  const doc = new JSDOM(await res.text()).window.document;
  const href = doc.querySelector('link[rel="icon"]')?.getAttribute("href") ?? "";
  expect(href).toBe("/favicon.svg");

  const icon = await fetch(new URL(href, baseUrl));
  expect(icon.status).toBe(200);
  expect(icon.headers.get("content-type")).toContain("image/svg+xml");
  expect(await icon.text()).toContain("<svg");
});
