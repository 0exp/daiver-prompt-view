# daiver-prompt-view

A Claude Code mod that ships a multi-line status line for under the prompt:
model, RAM and CPU, session, modes, the session's agents, usage bars, git state,
and Clawd, Claude's mascot, at the right edge.

```
Opus 5.5 -> [demo] (sid:419e75ee) <stime:1h23m> <automemory:on>
(effort:high) (outputstyle:Proactive) (thinkmode:thinking) (fastmode:false)                      ▐▛███▜▌
⚙ main:thinking (1m13s) │ agents:2 (sub:1 sh:1 mon:0) -> pending:0 running:2 waiting:0 idle:0  ▝▜█████▛▘
-> Explore (time:1m01s) [Find lock index usages]                                                 ▘▘ ▝▝
ctx ███░░░░░░░ 37% | lmt ████░░░░░░ 43% | rst ██████░░░░ 1h56m (at 17h48m) | pch ████████░░ 85%  2.1.303
[RAM: 12.5G/16G | 78%] [CPU: 1.2/8 | 15%]
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
5. The machine's RAM and CPU (the `resources` option, see below).
6. Git: short sha, branch, flags (`+` staged, `#` untracked, `?` unstaged),
   the lines added and removed in the diff against HEAD (`+12/-3`; `+N/-N`
   when the tree is clean) and the working directory.

## Clodik

Clawd sits at the right edge of the terminal, vertically centered, in Claude
orange, with the Claude Code version under its feet: as far from the edge as the
status line is from the left one. When the width (`$COLUMNS`) is unknown or too
narrow, it sits right next to the lines.

While Claude Code is busy (the agents line shows the main loop anything but
`idle`), Clawd moves: jump, spin around, sway, blink, cheer, wave, squash and
stretch, hop side to side, tap dance, shiver, fall to pixels and back, dissolve
into the Matrix's rain of glyphs and back. A new
random animation starts every 8 seconds, a frame per refresh.

## Commands

Every command sets the option of the same row in `/config` (so the choice stays
across sessions and reloads), answers at once, and never starts a model turn.
The prompt box's typeahead lists each command's values: type the command's
prefix (`/daiver-prompt-view:clodik:`) for ready rows such as
`/daiver-prompt-view:clodik:animation spin`, or the first letter of the value
after the command.

| Command | Arguments | Default | What it does |
| --- | --- | --- | --- |
| `/daiver-prompt-view:clodik:animate` | `on`, `off`, or nothing | `off` | Animate Clawd all the time (`on`) or only while Claude Code is busy (`off`); with no argument, toggles |
| `/daiver-prompt-view:clodik:animation` | an animation name, or nothing | `random` | Pick the animation Clawd plays; with no argument, shows the current one and the list |
| `/daiver-prompt-view:view:theme` | a theme name, or nothing | `default` | Pick the colors of every line (the agents line's included); with no argument, shows the current one and the list |
| `/daiver-prompt-view:resources:show` | `on`, `off`, or nothing | `on` | Show (`on`) or hide (`off`) the RAM and CPU line; with no argument, shows whether it is on |

### `/daiver-prompt-view:clodik:animate [on|off]`

Option `clodikAnimate` (Animate Clawd always), default `off`: Clawd moves only
while Claude Code is busy (the agents line's main loop is anything but `idle`).

| Usage | Result |
| --- | --- |
| `/daiver-prompt-view:clodik:animate on` | Clawd animates all the time, busy or not: `Clawd now animates all the time.` |
| `/daiver-prompt-view:clodik:animate off` | Clawd animates only while busy: `Clawd now animates only while Claude Code is busy.` |
| `/daiver-prompt-view:clodik:animate` | toggles between the two |
| `/daiver-prompt-view:clodik:animate maybe` | nothing changes: `Usage: /daiver-prompt-view:clodik:animate [on\|off]` |

### `/daiver-prompt-view:clodik:animation [name]`

Option `clodikAnimation` (Clawd's animation), default `random`.

| Value | Animation |
| --- | --- |
| `random` (default) | a random one of the others, a new one every 8 seconds, never the same twice in a row |
| `jump` | squash and jump |
| `spin` | turn around |
| `sway` | sway left and right |
| `blink` | blink |
| `cheer` | raise both arms |
| `wave` | wave one arm |
| `stretch` | squash and stretch |
| `hop` | hop side to side |
| `tap` | tap dance |
| `shiver` | shiver |
| `pixels` | fall to pixels and back |
| `matrix` | fall to pixels, then the Matrix's rain of glyphs runs down the canvas, then back |

| Usage | Result |
| --- | --- |
| `/daiver-prompt-view:clodik:animation spin` | Clawd plays `spin`: `Clawd now plays spin.` |
| `/daiver-prompt-view:clodik:animation random` | back to random: `Clawd now plays a random animation.` |
| `/daiver-prompt-view:clodik:animation` | shows the current one: `Clawd's animation: spin (one of random, jump, …)` |
| `/daiver-prompt-view:clodik:animation moonwalk` | nothing changes: `Usage: /daiver-prompt-view:clodik:animation [random\|jump\|…]` |

The animation plays while Clawd animates: while busy, or all the time with
`clodik:animate on`.

### `/daiver-prompt-view:view:theme [name]`

Option `theme` (Color theme), default `default`.

| Value | Colors |
| --- | --- |
| `default` (default) | white, gray, fuchsia (ctx), sky blue (lmt), light green (rst), Clawd orange, gray-green (pch), khaki (sha), violet (branch), coral (flags), light green (+added), coral (-removed), Clawd orange (the matrix rain too) |

| Usage | Result |
| --- | --- |
| `/daiver-prompt-view:view:theme default` | the status line and the agents line switch at once: `The status line now uses the default theme.` |
| `/daiver-prompt-view:view:theme` | shows the current one: `Status line theme: default (one of default)` |
| `/daiver-prompt-view:view:theme neon` | nothing changes: `Usage: /daiver-prompt-view:view:theme [default]` |

## Options

Every option is in `/config`, or in `~/.claude/settings.json` under
`pluginConfigs["daiver-prompt-view@daiver-prompt-view"].options`. A change in
`/config` reloads the mod and applies at once.

| Option | `/config` label | Type | Default | Values | Command |
| --- | --- | --- | --- | --- | --- |
| `resources` | Show RAM and CPU | boolean | `true` | `true`, `false` | `resources:show` |
| `clodik` | Show Clawd | boolean | `true` | `true`, `false` | (none) |
| `clodikAnimate` | Animate Clawd always | boolean | `false` | `true`, `false` | `clodik:animate` |
| `clodikAnimation` | Clawd's animation | choice | `random` | `random`, `jump`, `spin`, `sway`, `blink`, `cheer`, `wave`, `stretch`, `hop`, `tap`, `shiver`, `pixels`, `matrix` | `clodik:animation` |
| `theme` | Color theme | choice | `default` | `default` | `view:theme` |

For example, in `~/.claude/settings.json`:

```json
"pluginConfigs": {
  "daiver-prompt-view@daiver-prompt-view": {
    "options": {
      "resources":       true,
      "clodik":          true,
      "clodikAnimate":   false,
      "clodikAnimation": "pixels",
      "theme":           "default"
    }
  }
}
```

### RAM and CPU

With `resources` on, the line under the bars shows the machine's memory and
CPU use:

| `resources` | Line under the bars |
| --- | --- |
| `true` | `[RAM: 12.5G/16G \| 78%] [CPU: 1.2/8 \| 15%]` |
| `false` | no such line: the git line follows the bars |

### `/daiver-prompt-view:resources:show [on|off]`

Option `resources` (Show RAM and CPU), default `true` (`on`).

| Value | Effect |
| --- | --- |
| `on` | the RAM and CPU line is drawn under the bars |
| `off` | no such line |

| Usage | Result |
| --- | --- |
| `/daiver-prompt-view:resources:show on` | `The status line now shows RAM and CPU.` |
| `/daiver-prompt-view:resources:show off` | `The status line no longer shows RAM and CPU.` |
| `/daiver-prompt-view:resources:show` | shows the current state: `The RAM and CPU line is on.` |
| `/daiver-prompt-view:resources:show maybe` | nothing changes: `Usage: /daiver-prompt-view:resources:show [on|off]` |

`RAM` is used over total memory (GiB) and the used share; `CPU` is the busy
cores over all cores and the busy share. On macOS, memory is Activity Monitor's
"Memory Used" (`vm_stat`: anonymous minus purgeable, wired and compressor
pages) and CPU the sum of every process's `%cpu` from `ps`, a decaying average
of the last minute (`top` would take half a second per refresh). Elsewhere,
memory is `/proc/meminfo`'s total minus available, and CPU the busy share of
`/proc/stat` since the previous refresh, kept in
`~/.claude/daiver-prompt-view/cpu` (so the first refresh shows RAM alone).

### Adding a theme

Every theme is written once, in `hooks/shared/themes.ts`: the hooks module draws
the agents line with it and writes the status line's colors to
`~/.claude/daiver-prompt-view/theme.sh` for the script. A new theme is an entry
in `THEMES` there, its name in the `theme` option's `options` in
`.claude-plugin/plugin.json`, and in `commands/view/theme.md`'s `argument-hint`.

The commands are the plugin's `commands/<feature>/<name>.md` files, which Claude
Code names `/daiver-prompt-view:<feature>:<name>`; the hooks module answers each
itself.

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
(the options), `theme.sh` (the active theme's colors), `agents/<session_id>`,
`automemory/<session_id>` and, off macOS, `cpu` (the last CPU sample).

## Develop

Development rules (docs for every option and command, typeahead for every
command's values) are in `.claude/CLAUDE.md`.

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
