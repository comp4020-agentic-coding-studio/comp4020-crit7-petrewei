# ANU Timetable

A replacement for one part of ANU's MyTimetable: seeing how your tutorial and lab allocation fits with your lectures. It lists the groups for my COMP3300 lab and COMP4020 tutorial with the allocated one marked, records a new allocation in SQLite, and shows one dated week at a time with clashes marked on the dates they happen.

It models my own Second Semester 2026 timetable and has no login, so anyone with the URL can change the recorded allocation.

## What good looks like here

- **Real data.** Sessions and groups were copied from MyTimetable on 29 September 2026 into `src/data/timetable-2026-s2.json` and are seeded on every boot. The calendar feed URL stays out of the repo because it gives read access to my timetable.
- **One clash rule.** Two meetings clash when they fall on the same weekday, overlap in time, and share a date. The date matters for one-off meetings: the COMP3500 lecture on 30 July clashes with lab 01 only that week.
- **The database is the source of truth.** A recorded allocation survives a reload, a restart and a redeploy because it lives in SQLite on the Fly volume.
- **No JavaScript needed.** "This is my group" is a form button, week navigation is plain links, and the server rejects a group the activity does not have.

Not built: preference ranking, login, live updates between tabs, and editing the timetable.

The tests in `spec/` cover persistence, the form, the rejections, the clash rule, that every group comes from the MyTimetable copy, and that no feed URL or uni ID is committed. Whether this is clearer than MyTimetable and reads well on a phone is left to judgement. The agent's rules are in `CLAUDE.md`.
