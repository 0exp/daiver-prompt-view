# daiver-prompt-view

A Claude Code mod that ships a multi-line status line for under the prompt:
model and session, modes, the session's agents, usage bars, git state, and
Clawd, Claude's mascot, at the right edge.

```
Opus 5.5 -> [demo] (sid:419e75ee) <stime:1h23m> <automemory:on>
(effort:high) (outputstyle:Proactive) (thinkmode:thinking) (fastmode:false)                      ▐▛███▜▌
⚙ main:thinking (1m13s) │ agents:2 (sub:1 sh:1 mon:0) -> pending:0 running:2 waiting:0 idle:0  ▝▜█████▛▘
-> Explore (time:1m01s) [Find lock index usages]                                                 ▘▘ ▝▝
ctx ███░░░░░░░ 37% | lmt ████░░░░░░ 43% | rst ██████░░░░ 1h56m (at 17h48m) | pch ████████░░ 85%  2.1.303
 (08d3788a) main [+#?] | ~/Projects/demo
```

It joins two former mods, [agent-prompt-view](https://github.com/0exp/claude-agent-prompt-view)
and [agent-count](https://github.com/0exp/claude-agent-count), with their history.

## The lines

1. Model, session name, short session id, session time (`stime`, from the
   transcript's creation time), whether auto memory is on in this session
   (`automemory`, written by the hooks module: the status line's input has no
   such field).
2. Modes: reasoning effort, output style, thinking, fast mode (each only when known).
3. Agents (the `agents` feature):
   - `main`: the main loop: `thinking` while its turn runs, `tool:<name>` while
     one of its tool calls runs, `waiting` once the turn ended while background
     work is still pending, running or waiting, `idle` once the turn ended and
     nothing is in flight; while it works, the time spent on the current prompt,
     e.g. `(1m05s)`; once idle, the last prompt's time, e.g. `(ltt:2m10s)`.
   - `agents`: everything in flight besides the main loop; `sub` subagents and
     teammates, `sh` background shell commands, `mon` monitors. While only the
     main loop works, `agents:main` replaces the zero.
   - `pending` / `running` / `waiting` / `idle`: the same work by state
     (finished, failed and killed ones are not counted).
   - `-> <type> (time:<run time>) [<task>]`: one line per live subagent or
     teammate, oldest first: its agent type (a teammate's name), how long it has
     been listed (from the first poll that listed it; starts over on a reload),
     and the Agent call's `description`, cut to 60 characters.

   Agents come from `$.agent.list()`, polled every second. Shells and monitors
   are tracked from their `Bash` / `Monitor` calls and dropped on their task
   notification, `TaskStop`, or the `Stop` hook's `background_tasks` snapshot.
4. Bars: `ctx` context window used, `lmt` 5-hour rate limit used, `rst` time to
   its reset and, in orange, its local time (24-hour `HHhMMm`), `pch` prompt
   cache hits of the last request. All four show from the start: before the
   first response (or once the 5-hour window has reset) `lmt` is 0%, `rst` a
   whole 5h00m window and `pch` 0%.
5. Git: short sha, branch, flags (`+` staged, `#` untracked, `?` unstaged) and
   the working directory.

## Clodik

Clawd sits at the right edge of the terminal, vertically centered, in Claude
orange, with the Claude Code version under its feet: as far from the edge as the
status line is from the left one. When the width (`$COLUMNS`) is unknown or too
narrow, it sits right next to the lines.

While Claude Code is busy (the agents line shows the main loop anything but
`idle`), Clawd moves: jump, spin around, sway, blink, cheer, wave, squash and
stretch, hop side to side, tap dance, shiver, fall to pixels and back. A new
random animation starts every 8 seconds, a frame per refresh.

## Options and commands

Every option is in `/config` (or `pluginConfigs["daiver-prompt-view@daiver-prompt-view"].options`
in `~/.claude/settings.json`); the commands set the same options. The prompt
box's typeahead lists each command's values.

| Option | Default | Command | What |
| --- | --- | --- | --- |
| `clodik` (Show Clawd) | `true` | | Clawd at the right edge |
| `clodikAnimate` | `false` | `/daiver-prompt-view:clodik:animate [on\|off]` | animate all the time, not only while busy (toggles with no argument) |
| `clodikAnimation` | `random` | `/daiver-prompt-view:clodik:animation [name]` | `random`, `jump`, `spin`, `sway`, `blink`, `cheer`, `wave`, `stretch`, `hop`, `tap`, `shiver`, `pixels` (shows the current one with no argument) |
| `theme` (Color theme) | `default` | `/daiver-prompt-view:view:theme [name]` | the colors of every line, the agents line's included |

Themes: `default` (white, gray, fuchsia, sky blue, light green, Clawd orange,
khaki, violet, coral). Every theme is written once, in `hooks/shared/themes.ts`:
the hooks module draws the agents line with it and writes the status line's
colors to `~/.claude/daiver-prompt-view/theme.sh` for the script. A new theme is
an entry in `THEMES` there and its name in the `theme` option's `options` in
`.claude-plugin/plugin.json` and in `commands/view/theme.md`'s `argument-hint`.

The commands are the plugin's `commands/<feature>/<name>.md` files, which Claude
Code names `/daiver-prompt-view:<feature>:<name>`; the hooks module answers each
itself, so a command never starts a model turn.

## Install

```
/plugin install daiver-prompt-view --marketplace 0exp/daiver-prompt-view
```

Answer `y` to add the marketplace, then pick a scope (user scope loads it in
every session).

## Show it in the status line

On every session start the mod copies its script (`statusline/daiver-prompt-view.sh`)
to `~/.claude/daiver-prompt-view/statusline.sh`, a path that stays the same across
plugin updates. Point `statusLine` in `~/.claude/settings.json` at it:

```json
"statusLine": {
  "type": "command",
  "command": "sh \"$HOME/.claude/daiver-prompt-view/statusline.sh\"",
  "refreshInterval": 1
}
```

Requires `jq` and `git`; the branch glyph needs a Nerd Font. The script uses
macOS `stat -f`; elsewhere `stime` falls back to the session's duration.

What the mod keeps in `~/.claude/daiver-prompt-view/`: `statusline.sh`, `config`
(the options), `theme.sh` (the active theme's colors), `agents/<session_id>`
and `automemory/<session_id>`.

## Develop

```
hooks/register.ts          the hooks module: options, the one session.start, typeahead
hooks/features/            statusline, agents, clodik, view: a file per feature
hooks/shared/              config, themes, commands, files, options
commands/<feature>/*.md    the slash commands
statusline/                the status line script (POSIX sh + jq + git)
tests/                     claude plugin test .
skills/daiver-prompt-view/ how Claude checks, changes, reloads and releases the mod
```

```
claude --plugin-dir .          # run a session with the mod loaded from this folder
claude plugin validate .       # manifest, marketplace and hooks module
claude plugin test .           # the tests
```
