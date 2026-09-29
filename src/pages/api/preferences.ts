import type { APIRoute } from "astro";
import { rankableLabels, saveRanking } from "../../lib/preferences";

// Each "Move up" button on the page posts its activity and the whole new
// ranking, so the form needs no JavaScript and the 303 re-renders the page
// from SQLite. Any client can post here, so the ranking is checked in full.
export const POST: APIRoute = async ({ request, redirect }) => {
  const form = await request.formData();
  const activity = String(form.get("activity") ?? "");
  const order = String(form.get("order") ?? "").split(",");

  const labels = rankableLabels(activity);
  if (!labels) {
    return reject(`no rankable activity "${activity}"`);
  }
  const isPermutation =
    order.length === labels.length &&
    new Set(order).size === order.length &&
    order.every((label) => labels.includes(label));
  if (!isPermutation) {
    return reject(`order must list each of ${labels.join(", ")} exactly once`);
  }

  saveRanking(activity, order);
  return redirect("/", 303);
};

const reject = (reason: string) =>
  new Response(reason, { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
