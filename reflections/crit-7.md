# Crit 7 Reflection

## 1 The Breakthrough

The breakthrough was treating the tests as the place my decisions live, instead of the rules file. I began with my Assignment 2 rules, 119 lines, and kept cutting them. Each time a rule could be checked by a test, such as "every page is listed in the routes file" or "a restart must not duplicate the seeded sessions", it became a test in `spec/` and the rule went. What was left in `CLAUDE.md` was the short list that only a person can hold: how to review a plan, how to verify, and how to write a check. With the red tests written before the build, the agent's first full implementation passed every test written for it at the first run, because the tests already said what the page had to do.

## 2 Who I Want to Be as a Developer

This week made me want to be a developer who writes the contract first and keeps it small. Working from my own timetable mattered: when the data was real, the real clashes on Thursdays became test cases, and a vague idea of "flag clashes" became a rule with a date condition I had to decide. I also removed two of the commit hooks the agent added and brought the privacy check back as a test that runs with the rest of the suite. I want every check I keep to be one I can explain and would notice failing.
