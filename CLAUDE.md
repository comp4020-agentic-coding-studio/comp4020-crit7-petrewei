# Crit 7 Timetable Preferences

This is the working agreement for the repository: each rule, and the reason it exists. The rules are part of what gets marked, so they are decisions rather than inherited defaults. Most of them are carried over from Assignment 2 (`comp4020-ass2-PetreWei`) and adapted to a full-stack app.

The platform is fixed and is not restated here: `fly.toml`, the `Dockerfile`, `.github/workflows/checks.yml` and `spec/README.md` each say what they fix. Read the published brief and spec on the [course website](https://comp.anu.edu.au/courses/comp4020-agentic-coding-studio/crits/07-anu-system/) before planning; they are the contract.

## 1 This Deliverable

Crit 7, week 8: build the ANU system you wish existed. The slice is MyTimetable's tutorial and lab preference ranking, because ranking there is opaque and there is no way to see how choices fit together across courses. The response is one page: ranked preferences per activity, a weekly grid of first choices, and clashes flagged on it. Cutoff is Wednesday 30 September 2026 at 07:00; the crit is at 09:00.

Where each spec line is held:

- **Loads at its `*.fly.dev` URL by the cutoff:** checked by hand after every deploy (§4).
- **Core flow persists across a reload:** `spec/timetable.test.ts`, which also holds the clash contract.
- **Commits, `PROCESS.md` and `reflections/crit-7.md`:** `pnpm check:evidence`.
- **A real ANU slice, and how I directed, grounded and corrected the work:** judged at the crit.

## 2 Data and Database

- **Two meetings clash when they fall on the same weekday, overlap in time, and share at least one date in their weeks.** A first choice is compared with every lecture and with the first choice of every other activity.
- **Change the schema in `src/lib/schema.ts` and generate a migration with `pnpm db:generate`; never edit a committed migration.** The Fly volume has already applied it and will not run it again.
- **Keep `/api/events` when the guestbook goes.** CI's post-deploy job fails without it once the repo is public.

## 3 Working Practices

- **Review the plan adversarially before building.** Ask what is ambiguous, what was assumed, which choice the spec requires as against merely prefers, and what the alternatives were.
- **List the plan's premises separately from its steps.** Mark each as the brief's, mine, or the agent's. Reviewing only the steps cannot find an error the plan and the reviewer share.
- **Build the slice the plan describes, and stop there.** Unrequested extras are drift even when they improve something, so propose them separately.
- **Never rewrite the spec to match the build.** A disagreement between the two is a decision to flag.

## 4 Verification

- **Return the evidence itself.** Drive the page in a real browser and produce the screenshot, console output, response body, DOM state or exit code.
- **Observe the saved row as well as the response.** A 303 shows the handler ran; `sqlite3 .data/app.db` shows the row exists. The local and production databases are separate and are each verified in their own environment.
- **Verify the deployed app after every deploy.** Open the `*.fly.dev` URL, save a ranking and reload, and check that it also survives the next deploy. The tests boot the built server against a throwaway database, so a migration or seed that fails on the Fly volume only shows up there.
- **Spend verification where the flows differ.** Drive the one or two flows that are genuinely distinct and let `pnpm check` cover the rest.

## 5 Sensors and Checks

- **Write the sensor before a change worth holding to.** When a judgement is worth keeping, encode it as a check first; the contract then outlives the edit and rejects later drift on its own.
- **Write the assertion so it can only pass for the right reason.** Assert that the thing is used, because a forbid-only check is satisfied by an empty page.
- **Expect a check to become the target.** The clash tests use one real clash and one session that fits, so a page that flags lab 01 by name would pass them; ask what a check would let through as well as what it would catch.
- **Treat a red check as correct until proven otherwise.** Update one when the contract it encodes has genuinely changed, and never weaken one to fit output you did not intend.
- **Confirm the failure a check describes can actually reach it.** If the build, the schema or the type checker already rejects that state, the test only ever reports green.
- **Treat `.github/workflows/` as harness.** Edit it only to restore a check that drifted from the initial commit's intent, and diff against that commit first.

## 6 Git and CI

- **Commit small and often, and say why in the message.** The commit trail is evidence of process; the diff shows what changed, and the message is the only place the reason survives.
- **Commit only on green, then push immediately.** Stage files by name. The one exception is a check written ahead of the thing that satisfies it: red on purpose, and the message says so.
- **Read a red CI run properly.** `gh run watch`, then `gh run view --log-failed`, for the actual failing command and its output instead of "the build failed".
- **Only put a number in a commit message you have just measured.** Read it from the command output in the same step as writing the message.

## 7 PROCESS.md

This crit's written account is `PROCESS.md` plus the reflection in `reflections/crit-7.md`, which `pnpm check:evidence` requires.

- **A paragraph or two, one narrative.** A first-person account of getting from the brief to the harness and the workflow, as against a run of fixes with a commit hash apiece.
- **Write each moment in STAR form, weighted.** Situation 20% (the specific difficulty, not the general situation), Task 10% (what I set out to achieve), Action 60% (what I did, why, and the alternatives I rejected), Result 10% (the outcome and what I learned). An even split recounts events; the weighting is what makes a capability visible.
- **Cite the discarded work too.** A deletion, a reverted commit, a rule added and then cut: judgement shows there, and successes alone read as a clean run that never happened.
- **Cite commits inline, as links whose text is the hash or range.** An uncited claim is discounted, and markers follow citations instead of hunting the repo.
- **Do not narrate past the evidence.** Filenames, dates, diffs and counts are evidence; a label for a phase, or a claim about what the work proves, is interpretation. Notice the seam where the citations stop and the story starts.

## 8 Markdown

- **Keep each prose paragraph on a single line.** A hard-wrapped rewrap diffs every line and buries the sentence that changed.
- **Number document subheadings, and set them in Title Case.** `## 1 Heading Level 2`, then `### 1.1 Heading Level 3`, so a section can be cited by number; the `# Title` is not numbered. Documents only — `CLAUDE.md`, `PROCESS.md` — never `README.md`, which the app serves at `/readme/` as its own prose.

## 9 Maintaining This File

- **Remove what is stale instead of writing a correction beside it.** This file says what is true now, and Git keeps the history.
- **Only what is short and always true belongs here.** A decision that applies to one session belongs in the prompt.
- **Keep each rule to the rule and one reason.** A second justification, a restatement or a closing generalisation makes the list slower to read without making it more binding.
- **A recurring correction belongs in a sensor or a skill.** Write a check when the lesson is deterministic, a skill when it is a procedure worth reusing, and lengthen this list only when it is neither.
