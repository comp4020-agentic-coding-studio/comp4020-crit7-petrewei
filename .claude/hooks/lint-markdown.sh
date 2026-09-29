#!/bin/sh
# PostToolUse hook on Edit|Write: lint a Markdown file as soon as it is
# written (CLAUDE.md §8). Exit 2 shows the problems to Claude to fix.
file=$(jq -r '.tool_input.file_path // empty')

case "$file" in
*.md) ;;
*) exit 0 ;;
esac
[ -f "$file" ] || exit 0

if ! command -v markdownlint-cli2 >/dev/null 2>&1; then
	echo "markdownlint-cli2 is not installed; lint $file by hand" >&2
	exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0
if ! output=$(markdownlint-cli2 "$file" 2>&1); then
	echo "$output" >&2
	exit 2
fi
