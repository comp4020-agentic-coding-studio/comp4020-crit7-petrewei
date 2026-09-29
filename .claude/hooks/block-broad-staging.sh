#!/bin/sh
# PreToolUse hook on Bash: refuse commands that stage everything at once, so
# files are staged by name and a stray file cannot ride along into a repo that
# goes public at the cutoff. Exit 2 blocks the call and shows stderr to Claude.
# Heredoc bodies and quoted strings are dropped, so the text of a commit
# message is never matched.
options=$(jq -r '.tool_input.command // empty' | awk '
	skip { if ($0 == delim) skip = 0; next }
	match($0, /<<-?[[:space:]]*["\047]?[A-Za-z_]+/) {
		delim = substr($0, RSTART, RLENGTH); sub(/^<<-?[[:space:]]*["\047]?/, "", delim); skip = 1
	}
	{ print }' | sed -e 's/"[^"]*"//g' -e "s/'[^']*'//g")

if printf '%s\n' "$options" | grep -qE 'git[[:space:]]+add[[:space:]]+(.*[[:space:]])?(-A|--all|-u|--update|\.|:/)([[:space:]]|;|&|\||$)'; then
	echo "blocked: stage files by name (CLAUDE.md §6), not with git add -A/-u/./:/" >&2
	exit 2
fi

if printf '%s\n' "$options" | grep -qE 'git[[:space:]]+commit[[:space:]]+(.*[[:space:]])?-[A-Za-z]*a[A-Za-z]*([[:space:]]|;|&|\||$)'; then
	echo "blocked: git commit -a stages every tracked change; stage files by name (CLAUDE.md §6)" >&2
	exit 2
fi
