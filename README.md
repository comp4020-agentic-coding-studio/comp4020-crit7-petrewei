# Tutorial and lab preferences

A replacement for one part of ANU's MyTimetable: ranking your preferences for tutorial and lab groups. MyTimetable asks you to rank each activity's groups separately, and nothing shows how your choices fit together across courses, so you find a clash after you have submitted. This app lists the groups for my COMP3300 lab and COMP4020 tutorial, lets me reorder them, saves the ranking in SQLite, and flags any first choice that overlaps a lecture or another first choice, naming what it clashes with.

It models my own Second Semester 2026 timetable and has no login, so anyone with the URL can reorder the rankings.

## What good looks like here

Good here means the data is real and the clash flags are true.

- **Real data.** The sessions come from my MyTimetable calendar feed and the group lists on its preference pages, copied on 29 September 2026 into `src/data/timetable-2026-s2.json`, and seeded into the database on every boot. The feed URL stays out of the repo because it gives read access to my timetable.
- **One clash rule.** Two meetings clash when they fall on the same weekday, one starts before the other ends, and they share at least one date. The date condition matters because some meetings happen once: the COMP3500 lecture on 30 July clashes with lab 01, while a make-up tutorial on 6 October could only clash in that week.
- **The database is the source of truth.** A ranking survives a reload, a restart and a redeploy because it lives in the SQLite file on the Fly volume.
- **It works without JavaScript.** Each "Move up" button posts the whole new ranking, and the server rejects anything that is not exactly the activity's groups.

What I chose not to build: allocation, login, live updates between open tabs, a week-by-week view, and editing the timetable in the app.

The checks in `spec/` enforce the mechanical parts: persistence across a reload and a restart, the form, the rejections, the clash rule (including the date cases no real pair exercises), that every group shown comes from the MyTimetable copy, and that no feed URL or uni ID is committed. The rules the agent works under are in `CLAUDE.md`. Two things are judgement calls that no test holds: whether this is clearer than MyTimetable, and whether the page reads well on a phone.
