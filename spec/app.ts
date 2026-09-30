import { JSDOM } from "jsdom";
import { expect, inject } from "vitest";

// What the HTTP spec files share: the test server, the two choosable
// activities, and the requests they make of it.
export const baseUrl = inject("baseUrl");

export const LAB = "COMP3300-ComA";
export const TUT = "COMP4020-TutA";

// Text with every run of whitespace as one space, as it reads on screen.
export const squash = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();

// The page at `path`, parsed as a browser would.
export const page = async (path = "/", base = baseUrl): Promise<Document> => {
  const res = await fetch(new URL(path, base));
  expect(res.status, `GET ${path}`).toBe(200);
  return new JSDOM(await res.text()).window.document;
};

// Astro rejects form POSTs without a same-origin Origin header (CSRF check).
export const post = (body: URLSearchParams, base = baseUrl): Promise<Response> =>
  fetch(new URL("/api/allocation", base), {
    method: "POST",
    headers: { origin: base },
    body,
    redirect: "manual",
  });

// An allocation a test depends on, so a failed save fails there.
export const record = async (activity: string, group: string, base = baseUrl): Promise<void> => {
  const res = await post(new URLSearchParams({ activity, group }), base);
  expect(res.status, `recording ${activity} ${group}`).toBe(303);
};

// MyTimetable's own allocation, which a fresh database starts with.
export const restoreAllocation = async (): Promise<void> => {
  await record(LAB, "04");
  await record(TUT, "03");
};

export const groupsOf = (doc: Document, activity: string): string[] =>
  [...doc.querySelectorAll(`[data-activity="${activity}"] [data-group]`)].map(
    (el) => el.getAttribute("data-group") ?? "",
  );

export const allocatedOf = (doc: Document, activity: string): string[] =>
  [...doc.querySelectorAll(`[data-activity="${activity}"] [data-group][data-allocated]`)].map(
    (el) => el.getAttribute("data-group") ?? "",
  );
