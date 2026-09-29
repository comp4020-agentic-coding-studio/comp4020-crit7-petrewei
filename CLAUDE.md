# Crit 7 Timetable Preferences

This is the working agreement for the repository: each rule, and the reason it exists. The rules are part of what gets marked, so they are decisions rather than inherited defaults. Most of them are carried over from Assignment 2 (`comp4020-ass2-PetreWei`) and adapted to a full-stack app.

The platform is fixed and is not restated here: `fly.toml`, the `Dockerfile`, `.github/workflows/checks.yml` and `spec/README.md` each say what they fix. Read the published brief and spec on the [course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/07-anu-system/) before planning; they are the contract.

## 1 This Deliverable

Crit 7, week 8: build the ANU system you wish existed. The slice is MyTimetable's tutorial and lab preference ranking, because ranking there is opaque and there is no way to see how choices fit together across courses. The response is one page: ranked preferences per activity, a weekly grid of first choices, and clashes flagged on it. Cutoff is Wednesday 30 September 2026 at 07:00; the crit is at 09:00.

Where each spec line is held:

- **Loads at its `*.fly.dev` URL by the cutoff:** checked by hand after every deploy (§5).
- **Core flow persists across a reload:** `spec/timetable.test.ts`, which also holds the clash contract.
- **Commits, `PROCESS.md` and `reflections/crit-7.md`:** `pnpm check:evidence`.
- **A real ANU slice, and how I directed, grounded and corrected the work:** judged at the crit.

## 2 Data and Database

- **Session data comes only from `src/data/timetable-2026-s2.json`, copied from MyTimetable.** If something is missing, say so instead of inventing a time or a room; the spec requires a real slice, and a made-up session makes every clash result untrue.
- **Two meetings clash when they fall on the same weekday, overlap in time, and share at least one date in their weeks.** A first choice is compared with every lecture and with the first choice of every other activity. The date condition is my decision: one-off meetings such as tutorial 01's Tuesday 6/10 slot or the single COMP3500 lecture on 30/7 must only clash in the weeks they actually happen. Back-to-back meetings, where one ends as the other starts, do not clash; that condition was the agent's proposal.
- **The database is the only source of truth for rankings.** `localStorage` or server memory would survive a reload in one browser but not a second session or a restart (Lecture 7).
- **Validate every POST on the server.** An unknown activity, or an order that is not exactly that activity's groups, is rejected and changes nothing, because any client can bypass the form's own constraints (Lecture 7).
- **Keep the calendar feed URL, uni ID, email and MyTimetable screenshots out of the repo.** It goes public at the cutoff, and the feed URL gives read access to my timetable.
- **Change the schema in `src/lib/schema.ts` and generate a migration with `pnpm db:generate`; never edit a committed migration.** Migrations run at boot against the Fly volume, which records the ones already applied and will not run an edited one again. Review the generated SQL, and check the app against the existing database as well as a fresh one (Lecture 7).
- **Seeding must be safe to run against a database that already has data.** The live database persists across restarts and deploys, and a seed that inserts on every boot duplicates every session; the test database is always fresh, so the tests cannot catch this.
- **Remove the guestbook and `spec/guestbook.test.ts` together when the preference page replaces them.** `spec/README.md` retires that test with the starter, but `/api/events` stays because CI checks it (§6).

## 3 Working Practices

- **Write the plan down before building.** So there is something to argue with, and something the finished work can be checked against. It states the response, the scope wall, and what is deliberately out.
- **Review the plan adversarially before building.** Ask what is ambiguous, what was assumed, which choice the spec requires as against merely prefers, and what the alternatives were. Agreement is not review: "you're absolutely right" means the prompt left no room for disagreement.
- **List the plan's premises separately from its steps.** Mark each as the brief's, mine, or the agent's. Reviewing only the steps cannot find an error the plan and the reviewer share.
- **Correct a wrong premise before acting on it.** Say so first and work from the corrected version; building quietly on the mistake buries it in the result.
- **Build the slice the plan describes, and stop there.** Unrequested extras are drift even when they improve something, so propose them separately.
- **Keep output pristine.** Leave no ignored errors, warnings or backtraces in logs.
- **Never rewrite the spec to match the build.** A disagreement between the two is a decision to flag.

## 4 Facts and Writing

- **Fetch every fact from its source, and say which source.** A confabulated session time or room arrives fluent and confident, and does more damage than an honest omission in an app that claims to model a real timetable.
- **Ground "today" in the machine clock.** Run `date +%Y-%m-%d` before reasoning about teaching weeks, a clash in a given week, or the cutoff.
- **Say where a rule or a framing came from.** The brief, the spec, tutor feedback, my judgement, or the agent's. An invented convention that reads as an inherited one cannot be argued with.
- **Write plainly and specifically**, in concrete days, times, rooms and course codes. Avoid the performing register: the `X, not Y` antithesis as a template, a bare aphorism as a heading or closer, three clauses built to a beat, a double negative standing in for a conclusion. A flat imperative is fine; it is the poetic phrasing that is out.

## 5 Verification

- **Check the baseline first.** Run `pnpm check` before changing anything, so a later failure belongs to the change. `spec/timetable.test.ts` is red on purpose until the preference page exists, so read what is failing before assuming red was inherited.
- **Return the evidence itself.** Drive the page in a real browser and produce the screenshot, console output, response body, DOM state or exit code. "The form submits correctly" is not verification when the observed response is a 403.
- **The screenshot and the console fail independently.** A perfect screenshot can sit on top of a 404, a failed parse and placeholder values. Read both.
- **Submit through the real form, not only the endpoint.** A test that POSTs directly stays green when the form's field names drift from the handler's, and every ranking is then silently lost behind a normal 303 (Lecture 7).
- **Observe the saved row as well as the response.** A 303 shows the handler ran; `sqlite3 .data/app.db` shows the row exists. The local and production databases are separate and are each verified in their own environment (Lecture 7).
- **Verify the deployed app after every deploy.** Open the `*.fly.dev` URL, save a ranking and reload, and check that it also survives the next deploy. The tests boot the built server against a throwaway database, so a migration or seed that fails on the Fly volume only shows up there.
- **Read the port the dev server reports.** It moves to 4322 when 4321 is taken, and `ASTRO-DEV-TOOLBAR` in the tab order means the dev server got tested in place of the build.
- **Spend verification where the flows differ.** Drive the one or two flows that are genuinely distinct and let `pnpm check` cover the rest. Extract the value needed instead of capturing the whole page, and do not re-observe what has not changed.
- **Reproduce before fixing.** For a bug found by hand, add a failing test first, confirm it fails for the right reason, then fix.
- **A passing suite establishes only what it checks.** The axe pass runs in jsdom with colour contrast disabled, and only on the routes in `spec/routes.ts`. Whether the page is usable needs a person: show the change to someone who has not seen it.

## 6 Sensors and Checks

- **Add every new page to `spec/routes.ts`.** The invariants and the axe pass only visit the routes listed there, so an unlisted page is silently unchecked.
- **Ask whether a person is needed before writing a check.** "The ranking survives a reload" is mechanical; "ranking is less opaque than MyTimetable" needs a reader. A check for something only a person can settle is theatre.
- **Write the sensor before a change worth holding to.** When a judgement is worth keeping, encode it as a check first; the contract then outlives the edit and rejects later drift on its own.
- **Write the assertion so it can only pass for the right reason.** Assert that the thing is used, because a forbid-only check is satisfied by an empty page. Give a compound promise one assertion per claim, and name the offending value in the message.
- **Say what changed in order to make a check pass.** Whatever the edit gave up is invisible in a green run.
- **Expect a check to become the target.** The clash tests use one real clash and one session that fits, so a page that flags lab 01 by name would pass them; ask what a check would let through as well as what it would catch.
- **Say what a sensor does not cover.** A check that states its blind spots can be trusted.
- **Treat a red check as correct until proven otherwise.** Update one when the contract it encodes has genuinely changed, and never weaken one to fit output you did not intend.
- **Repair or remove a check that stays red without being actionable.** A check that never turns green teaches everyone to ignore it.
- **Confirm the failure a check describes can actually reach it.** If the build, the schema or the type checker already rejects that state, the test only ever reports green.
- **Treat `.github/workflows/` as harness.** Edit it only to restore a check that drifted from the initial commit's intent, and diff against that commit first. After shipping, its deploy job requires `/api/events` to stream, same-origin form POSTs to succeed and cross-site POSTs to be refused, so none of those can go when the guestbook does.

## 7 Git and CI

The pre-commit hook blocks staged `sk-` keys, such as the course proxy key; CI's scan only sees a key once it has already been pushed. The hook does not recognise the Fly token (`FlyV1 fm2_…`), so that token is kept out only by `mise.local.toml` staying gitignored and by staging files by name.

CI skips every job while the repo is private, so until shipping `pnpm check`, `pnpm check:evidence` and a hand deploy are the only gates. Shipping makes the whole repo public, not just the app. Source, commit history, CI logs and this file are all readable, so write every commit message and every rule here for someone outside the course.

- **Commit small and often, and say why in the message.** The commit trail is evidence of process; the diff shows what changed, and the message is the only place the reason survives.
- **Commit only on green, then push immediately.** Stage files by name. The one exception is a check written ahead of the thing that satisfies it: red on purpose, and the message says so.
- **Never rewrite history.** No force pushes, no amending what is already pushed. Correct it in the next commit; the log should show the mistakes too.
- **Read a red CI run properly.** `gh run watch`, then `gh run view --log-failed`, for the actual failing command and its output instead of "the build failed".
- **Only put a number in a commit message you have just measured.** Read it from the command output in the same step as writing the message.
- **Commit the updated lockfile after any dependency change.** The `Dockerfile` and CI both install with `--frozen-lockfile`, so a stale `pnpm-lock.yaml` breaks the deploy even though it works locally.

## 8 PROCESS.md

This crit's written account is `PROCESS.md` plus the reflection in `reflections/crit-7.md`, which `pnpm check:evidence` requires.

- **A paragraph or two, one narrative.** A first-person account of getting from the brief to the harness and the workflow, as against a run of fixes with a commit hash apiece.
- **Write each moment in STAR form, weighted.** Situation 20% (the specific difficulty, not the general situation), Task 10% (what I set out to achieve), Action 60% (what I did, why, and the alternatives I rejected), Result 10% (the outcome and what I learned). An even split recounts events; the weighting is what makes a capability visible.
- **Its spine is three questions.** What I decided good looks like for this app; which of those decisions became a rule here or a check in `spec/`; and which I deliberately left to human judgement.
- **Cite the discarded work too.** A deletion, a reverted commit, a rule added and then cut: judgement shows there, and successes alone read as a clean run that never happened.
- **Cite commits inline, as links whose text is the hash or range.** An uncited claim is discounted, and markers follow citations instead of hunting the repo.
- **Do not narrate past the evidence.** Filenames, dates, diffs and counts are evidence; a label for a phase, or a claim about what the work proves, is interpretation. Notice the seam where the citations stop and the story starts.
- **The performing-register ban in §4 applies here too.**
- **Check the rendered file on GitHub before shipping.** Images need relative paths and nothing verifies that they render.

## 9 Markdown

- Follow `markdownlint` except `MD013`, and keep each prose paragraph on a single line. A hard-wrapped rewrap diffs every line and buries the sentence that changed.
- After creating or modifying Markdown files, run `markdownlint-cli2 --config ~/.markdownlint-cli2.yaml` on them and fix everything it reports.
- **Number document subheadings, and set them in Title Case.** `## 1 Heading Level 2`, then `### 1.1 Heading Level 3`, so a section can be cited by number; the `# Title` is not numbered. Documents only — `CLAUDE.md`, `PROCESS.md` — never `README.md`, which the app serves at `/readme/` as its own prose.

## 10 Maintaining This File

- **Remove what is stale instead of writing a correction beside it.** This file says what is true now, and Git keeps the history.
- **Only what is short and always true belongs here.** A decision that applies to one session belongs in the prompt.
- **Keep each rule to the rule and one reason.** A second justification, a restatement or a closing generalisation makes the list slower to read without making it more binding.
- **A recurring correction belongs in a sensor or a skill.** Write a check when the lesson is deterministic, a skill when it is a procedure worth reusing, and lengthen this list only when it is neither.
