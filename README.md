# ANU Timetable

A replacement for one part of ANU's MyTimetable: seeing your tutorial and lab allocation. MyTimetable shows each activity's groups separately, and nothing shows how the allocated ones fit together across courses. This app lists the groups for my COMP3300 lab and COMP4020 tutorial with the allocated one marked, lets me record a new allocation, which it saves in SQLite, and flags any allocated group that overlaps a lecture or another allocated group, naming what it clashes with. A calendar shows one dated week at a time, with each lecture and allocated group on the dates it meets.

It models my own Second Semester 2026 timetable and has no login, so anyone with the URL can change the recorded allocation.

## What good looks like here

Good here means the data is real and the clash flags are true.

- **Real data.** The sessions come from my MyTimetable calendar feed and the group lists on its preference pages, copied on 29 September 2026 into `src/data/timetable-2026-s2.json`, and seeded into the database on every boot. The feed URL stays out of the repo because it gives read access to my timetable.
- **One clash rule.** Two meetings clash when they fall on the same weekday, one starts before the other ends, and they share at least one date. The date condition matters because some meetings happen once: the COMP3500 lecture on 30 July clashes with lab 01, while a make-up tutorial on 6 October could only clash in that week.
- **The database is the source of truth.** A recorded allocation survives a reload, a restart and a redeploy because it lives in the SQLite file on the Fly volume.
- **It works without JavaScript.** Each "This is my group" button posts its group, the previous and next week links are plain links, and the server rejects a group the activity does not have.

What I chose not to build: preference ranking, login, live updates between open tabs, and editing the timetable in the app.

The checks in `spec/` enforce the mechanical parts: persistence across a reload and a restart, the form, the rejections, the clash rule (including the date cases no real pair exercises), that every group shown comes from the MyTimetable copy, and that no feed URL or uni ID is committed. The rules the agent works under are in `CLAUDE.md`. Two things are judgement calls that no test holds: whether this is clearer than MyTimetable, and whether the page reads well on a phone.
