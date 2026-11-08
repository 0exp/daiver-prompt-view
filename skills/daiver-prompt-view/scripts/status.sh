#!/bin/sh
# Health check of the daiver-prompt-view mod: install state, versions, installed
# script, statusLine wiring, the newest agents lines.
REPO="${DAIVER_PROMPT_VIEW_REPO:-$HOME/Projects/daiver-prompt-view}"
MOD="$HOME/.claude/daiver-prompt-view"
TARGET="$MOD/statusline.sh"
SETTINGS="$HOME/.claude/settings.json"

echo "== plugin"
claude plugin list 2>/dev/null | grep -A4 'daiver-prompt-view@' || echo "not installed"

echo "== repo ($REPO)"
if [ -d "$REPO" ]; then
  echo "manifest version: $(jq -r .version "$REPO/.claude-plugin/plugin.json")"
  git -C "$REPO" status --short 2>/dev/null | sed 's/^/  /'
else
  echo "missing: a directory install is read from this folder"
fi

echo "== installed script ($TARGET)"
if [ -f "$TARGET" ]; then
  echo "updated: $(stat -f '%Sm' "$TARGET")"
  if [ -f "$REPO/statusline/daiver-prompt-view.sh" ]; then
    cmp -s "$TARGET" "$REPO/statusline/daiver-prompt-view.sh" && echo "same as the repo" || echo "differs from the repo: reload plugins or start a session"
  fi
else
  echo "missing: written on the next session start with the plugin loaded"
fi

echo "== config"
cat "$MOD/config" 2>/dev/null | sed 's/^/  /' || echo "none yet"
head -n 1 "$MOD/theme.sh" 2>/dev/null

echo "== statusLine"
if jq -e '.statusLine.command | contains(".claude/daiver-prompt-view/statusline.sh")' "$SETTINGS" >/dev/null 2>&1; then
  echo "wired, refreshInterval: $(jq -r '.statusLine.refreshInterval // "default"' "$SETTINGS")"
else
  echo "not wired: statusLine.command does not run the installed script"
fi

echo "== agents lines ($MOD/agents)"
if [ -d "$MOD/agents" ]; then
  ls -t "$MOD/agents" | head -3 | while read -r f; do
    printf '%s  %s\n' "$(stat -f '%Sm' "$MOD/agents/$f")" "$f"
    sed $'s/\e\\[[0-9;]*m//g' "$MOD/agents/$f" | sed 's/^/  /'
  done
  echo "total: $(ls "$MOD/agents" | wc -l | tr -d ' ') file(s)"
else
  echo "none yet"
fi

echo "== sample render"
[ -f "$TARGET" ] && printf '{"model":{"display_name":"Model"},"cwd":"%s"}' "$REPO" | sh "$TARGET" | sed $'s/\e\\[[0-9;]*m//g'
