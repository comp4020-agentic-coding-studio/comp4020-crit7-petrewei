# ANU Timetable

See how your ANU tutorial and lab groups fit around your lectures, one dated week at a time.

**Live:** <https://comp4020-crit7-petrewei.fly.dev>

MyTimetable shows each course's groups on their own, with no way to see how the allocated groups fit together across courses. This app lists the groups for each lab and tutorial with the allocated one marked, lets you record a different group, and shows your lectures and allocated groups on the dates they meet, with clashes marked on the dates they happen.

It models my own Second Semester 2026 timetable (COMP3300, COMP3500 and COMP4020) and has no login, so anyone with the URL can change the recorded allocation.

## Features

- **Groups at a glance.** Each lab and tutorial lists its groups with their regular times and free places. A card's details give every meeting's type, dates and room, including one-off makeups such as a tutorial moved for a public holiday.
- **Record an allocation.** Press Allocate on a group to record it. The allocation is saved in SQLite, so it survives a reload, a restart and a redeploy.
- **Your week.** A Monday-to-Friday calendar of your lectures and allocated groups for the chosen teaching week, with previous and next week links.
- **Clashes on the right dates.** Two meetings clash when they fall on the same weekday, overlap in time, and share a date. A one-off meeting clashes only in its own week: the COMP3500 lecture on 30 July clashes with lab 01 that week alone.
- **No JavaScript needed.** Each Allocate button is a form button and week navigation is plain links, and the server rejects a group the activity does not have.
- **Simplified Chinese.** Both pages are also at `/zh/` and `/zh/readme/`, with course titles and labels translated and course codes, activity codes, group labels, rooms and times left as MyTimetable gives them.

## Data

Sessions and groups were copied from MyTimetable on 29 September 2026 into `src/data/timetable-2026-s2.json`, and the database is seeded from that file on every boot. The calendar feed URL stays out of the repo because it gives read access to my timetable.

## Tech Stack

- [Astro](https://astro.build) 7, server-rendered with the Node adapter
- SQLite through [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) and [Drizzle ORM](https://orm.drizzle.team)
- [Vitest](https://vitest.dev) and jsdom for tests against the built server
- [Fly.io](https://fly.io), with the database on a Fly volume

## Getting Started

You need Node 24 and pnpm 11; `mise install` sets up both from `mise.toml`.

```sh
pnpm install
pnpm dev
```

The dev server runs at <http://localhost:4321>. The database is created at `.data/app.db`; set `DATABASE_PATH` to use another file.

| Command            | What it does                                                 |
| ------------------ | ------------------------------------------------------------ |
| `pnpm dev`         | Start the dev server                                         |
| `pnpm build`       | Build the Node server into `dist/`                           |
| `pnpm check`       | Type-check, build and run every test                         |
| `pnpm db:generate` | Generate a migration after editing `src/lib/schema.ts`       |

## Testing

The tests in `spec/` boot the built server against a fresh database and cover persistence across a reload and a restart, the page's own form, the rejected requests, the clash rule, the Chinese pages, that every group comes from the MyTimetable copy, and that no feed URL or uni ID is committed. Whether the page is clearer than MyTimetable and reads well on a phone is left to judgement in a browser.

## Deployment

Every push to `main` runs the checks in GitHub Actions and, when they pass, deploys to Fly.io. Migrations run at boot on the machine that holds the volume.

## Project Layout

- `src/data/timetable-2026-s2.json`: the timetable copied from MyTimetable
- `src/lib/`: the schema, seed, clash rule, week view and translations
- `src/components/Timetable.astro`: the groups and the week calendar, served at `/` and `/zh/`
- `README.zh-CN.md`: this readme in Simplified Chinese, served at `/zh/readme/`
- `src/pages/api/allocation.ts`: records an allocation
- `spec/`: tests against the built server
- `drizzle/`: committed migrations

## Not Built

Preference ranking, login, live updates between tabs, and editing the timetable.

The agent's working rules are in `CLAUDE.md`, and the account of how the app was built is in `PROCESS.md`.
