import type { APIRoute } from "astro";
import { choosableLabels, saveAllocation } from "../../lib/allocation";

// Each "This is my group" button on the page posts its activity and group, so
// the form needs no JavaScript and the 303 re-renders the page from SQLite.
// Any client can post here, so both fields are checked.
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
  return redirect("/", 303);
};

const reject = (reason: string) =>
  new Response(reason, { status: 400, headers: { "content-type": "text/plain; charset=utf-8" } });
