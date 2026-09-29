import type { APIRoute } from "astro";
import { choosableLabels, saveAllocation } from "../../lib/allocation";

// Each Allocate button on the page posts its activity, group, the week on
// screen and, from the Chinese page, locale=zh, so the form needs no
// JavaScript and the 303 re-renders that week from SQLite. Any client can
// post here, so activity and group are checked.
export const POST: APIRoute = async ({ request, redirect }) => {
  // formData() throws on a body that is not a form, such as JSON.
  const form = await request.formData().catch(() => null);
  if (!form) {
    return reject("expected a form body");
  }
  const activity = String(form.get("activity") ?? "");
  const group = String(form.get("group") ?? "");

  const labels = choosableLabels(activity);
  if (!labels) {
    return reject(`no lab or tutorial "${activity}"`);
  }
  if (!labels.includes(group)) {
    return reject(`group must be one of ${labels.join(", ")}`);
  }

  saveAllocation(activity, group);
  // Go back to the week that was on screen, in the page's language; the page
  // checks the range itself. Only a known locale may choose the path.
  const week = String(form.get("week") ?? "");
  const prefix = form.get("locale") === "zh" ? "/zh" : "";
  return redirect(/^\d{1,2}$/.test(week) ? `${prefix}/?week=${week}` : `${prefix}/`, 303);
};

const reject = (reason: string) =>
  new Response(reason, { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
