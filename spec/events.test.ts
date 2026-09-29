import { expect, inject, it } from "vitest";

// CI's post-deploy job fails unless /api/events streams, but that job only runs
// once the repo is public. This holds the same promise locally, so replacing the
// guestbook cannot take the stream with it unnoticed.
const baseUrl = inject("baseUrl");

it("streams server-sent events from /api/events straight away", async () => {
  const res = await fetch(new URL("/api/events", baseUrl), {
    signal: AbortSignal.timeout(5_000),
  });
  expect(res.status).toBe(200);
  expect(res.headers.get("content-type")).toContain("text/event-stream");

  const reader = res.body?.getReader();
  if (!reader) throw new Error("no response body");
  const { value, done } = await reader.read();
  await reader.cancel();
  expect(done, "the stream closed without sending anything").toBe(false);
  expect(value?.byteLength ?? 0).toBeGreaterThan(0);
});
