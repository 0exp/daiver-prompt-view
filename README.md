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

The whole status line sits in a frame (dotted by default, a solid rounded line with `borderStyle` `line`) in the theme's `frame` color
(Clawd orange in `default`): as wide as the terminal when its width is known,
else as wide as the widest line, Clawd inside it at the right border.

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

## Your prompts, Claude's replies, tool calls, the spinner and command output

All of these frames, and the status line's, follow the `borders` option
(`/daiver-prompt-view:chat:show-borders`, see below); these ones also follow
`chatBorders` (`chat:show-chat-borders`), the status line's `statuslineBorders`
(`chat:show-statusline-borders`). How they are drawn, dotted (the default) or a
solid line, is the `borderStyle` option (`chat:border-style`).

Every prompt you send is drawn in the transcript inside a frame in the
theme's `prompt` color (Clawd orange in `default`). Only your own prompts are
framed: background task notifications and messages from other sessions keep the
plain row. Inside the frame the prompt is plain text, without the highlight the
bare row paints under it. The frame is drawing only, the stored message is
untouched, and a theme switch redraws it at once.

Claude's replies get a frame of their own, in the theme's `reply` color (neon
blue in `default`), around each text block as the transcript draws it. So do
the tool calls' rows (`Bash(ls)` and the result), in the theme's `tool` color
(dark violet in `default`), and the spinner line of a running turn
(`Sauteing… (12s)`), in the theme's `spinner` color (the output style's yellow in `default`), and the output row
of a slash command (`/reload-plugins`, `/cost`, this mod's own commands), in the
theme's `command` color (gray in `default`).

## Commands

Every command sets the option of the same row in `/config` (so the choice stays
across sessions and reloads), answers at once, and never starts a model turn.
When the row cannot be reached (a plugin above filters the list, or this build
has no such row) the change holds for the session alone (the debug log says so; the mod raises
no toasts).
The prompt box's typeahead lists each command's values: type the command's
prefix (`/daiver-prompt-view:clodik:`) for ready rows such as
`/daiver-prompt-view:clodik:animation spin`, or the first letter of the value
after the command.

| Command | Arguments | Default | What it does |
| --- | --- | --- | --- |
| `/daiver-prompt-view:clodik:animate` | `on`, `off`, or nothing | `off` | Animate Clawd all the time (`on`) or only while Claude Code is busy (`off`); with no argument, toggles |
| `/daiver-prompt-view:clodik:animation` | an animation name, or nothing | `random` | Pick the animation Clawd plays; with no argument, shows the current one and the list |
| `/daiver-prompt-view:view:theme` | a theme name, or nothing | `default` | Pick the colors of every line (the agents line's included); with no argument, shows the current one and the list |
| `/daiver-prompt-view:resources:show` | `on`, `off`, or nothing | `on` | Show (`on`) or hide (`off`) the RAM and CPU line; with no argument, toggles |
| `/daiver-prompt-view:history:show` | `on`, `off`, or nothing | `off` | Show (`on`) or hide (`off`) the pane with this session's prompts; with no argument, toggles |
| `/daiver-prompt-view:chat:show-borders` | `on`, `off`, or nothing | `on` | Show (`on`) or hide (`off`) the frames around prompts, replies, tool calls, the spinner, command output and the status line; with no argument, toggles |
| `/daiver-prompt-view:chat:show-chat-borders` | `on`, `off`, or nothing | `on` | Show (`on`) or hide (`off`) the frames around prompts, replies, tool calls, the spinner and command output, the status line's left as it is; with no argument, toggles |
| `/daiver-prompt-view:chat:show-statusline-borders` | `on`, `off`, or nothing | `on` | Show (`on`) or hide (`off`) the frame around the status line alone; with no argument, toggles |
| `/daiver-prompt-view:chat:border-style` | `dotted`, `line`, or nothing | `dotted` | Draw every frame dotted (`dotted`) or as a solid line (`line`); with no argument, shows the current one and the list |

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
| `default` (default) | white, gray, fuchsia (ctx), sky blue (lmt), light green (rst), Clawd orange, gray-green (pch), khaki (sha), violet (branch), coral (flags), light green (+added), coral (-removed), Clawd orange (the matrix rain, the frame around your prompts and the frame around the status line too), neon blue (the frame around Claude's replies), dark violet (the frame around the tool calls), yellow (the frame around the spinner, as the output style), gray (the frame around a command's output), Clawd orange (the prompt history pane's frame too), bright orange (the history message under the pointer), near black (the history pane's background) |

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
| `history` | Show the prompt history pane | boolean | `false` | `true`, `false` | `history:show` |
| `borders` | Show the frames | boolean | `true` | `true`, `false` | `chat:show-borders` |
| `chatBorders` | Show the chat's frames | boolean | `true` | `true`, `false` | `chat:show-chat-borders` |
| `statuslineBorders` | Show the status line's frame | boolean | `true` | `true`, `false` | `chat:show-statusline-borders` |
| `borderStyle` | Frame style | choice | `dotted` | `dotted`, `line` | `chat:border-style` |
| `clodik` | Show Clawd | boolean | `true` | `true`, `false` | (none) |
| `clodikAnimate` | Animate Clawd always | boolean | `false` | `true`, `false` | `clodik:animate` |
| `clodikAnimation` | Clawd's animation | choice | `random` | `random`, `jump`, `spin`, `sway`, `blink`, `cheer`, `wave`, `stretch`, `hop`, `tap`, `shiver`, `pixels`, `matrix` | `clodik:animation` |
| `theme` | Color theme | choice | `default` | `default` | `view:theme` |

For example, in `~/.claude/settings.json`:

```json
"pluginConfigs": {
  "daiver-prompt-view@daiver-prompt-view": {
    "options": {
      "resources":         true,
      "history":           false,
      "borders":           true,
      "chatBorders":       true,
      "statuslineBorders": true,
      "borderStyle":       "dotted",
      "clodik":            true,
      "clodikAnimate":     false,
      "clodikAnimation":   "pixels",
      "theme":             "default"
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
| `/daiver-prompt-view:resources:show` | toggles: `The status line no longer shows RAM and CPU.` when it was on, `The status line now shows RAM and CPU.` when it was off |
| `/daiver-prompt-view:resources:show maybe` | nothing changes: `Usage: /daiver-prompt-view:resources:show [on|off]` |

`RAM` is used over total memory (GiB) and the used share; `CPU` is the busy
cores over all cores and the busy share. On macOS, memory is Activity Monitor's
"Memory Used" (`vm_stat`: anonymous minus purgeable, wired and compressor
pages) and CPU the sum of every process's `%cpu` from `ps`, a decaying average
of the last minute (`top` would take half a second per refresh). Elsewhere,
memory is `/proc/meminfo`'s total minus available, and CPU the busy share of
`/proc/stat` since the previous refresh, kept in
`~/.claude/daiver-prompt-view/cpu` (so the first refresh shows RAM alone).

### Prompt history pane

With `history` on, a pane at the right (above the prompt in a narrow terminal)
lists every prompt you sent this session, newest first, each as a message of
its own: a frame in the theme's `prompt` color, the time it was sent
(`HH:MM:SS`, local) on top, the whole text under. A click on a message (or
Enter on it while the pane has the keyboard) scrolls the transcript to that
prompt; under the pointer a message's frame turns the theme's `hover` color
(a brighter orange in `default`); the pane's body sits on the theme's
`paneBackground`, darker than the terminal's own (near black in `default`) (the row's id comes with the row as the session stores it, or from the
session's transcript file for prompts sent before the mod loaded); a prompt
whose row cannot be found is noted in the debug log, nothing on screen. Slash commands are left out. On
the session start the list is read from Claude Code's own prompt log
(`~/.claude/history.jsonl`, this session's rows), so prompts sent before the mod
loaded are there too; from then on each prompt joins as it is sent. The list
lives in the session's state, so it survives a reload of the mod. The wheel
or the scroll keys move the list by messages while the header with the `×`
stays put (`↑3` after the count says how many newer messages are above); a
scrollbar at the list's right edge shows where it stands. While the list is empty the pane's body
is framed in the theme's `history` color (Clawd orange in `default`); with
messages inside, each has its own frame and the body none. The `×` in the top
right corner
(or `x` while the pane has the keyboard, or ctrl+x x) closes it and turns the
option off.

### `/daiver-prompt-view:history:show [on|off]`

Option `history` (Show the prompt history pane), default `false` (`off`).

| Value | Effect |
| --- | --- |
| `on` | the pane opens and stays open across sessions |
| `off` | the pane closes |

| Usage | Result |
| --- | --- |
| `/daiver-prompt-view:history:show on` | `The prompt history pane is now shown.` |
| `/daiver-prompt-view:history:show off` | `The prompt history pane is now hidden.` |
| `/daiver-prompt-view:history:show` | toggles: `The prompt history pane is now shown.` when it was off, `The prompt history pane is now hidden.` when it was on |
| `/daiver-prompt-view:history:show maybe` | nothing changes: `Usage: /daiver-prompt-view:history:show [on|off]` |

### `/daiver-prompt-view:chat:show-borders [on|off]`

Option `borders` (Show the frames), default `true` (`on`). It covers every
frame the mod draws in the transcript (your prompts, Claude's replies, tool
calls, the spinner, command output) and the frame around the status line; the
history pane's own frames stay. Under it, `chatBorders` and `statuslineBorders`
hide one half each:

| `borders` | `chatBorders` | `statuslineBorders` | Transcript frames | Status line frame |
| --- | --- | --- | --- | --- |
| `on` | `on` | `on` | drawn | drawn |
| `on` | `off` | `on` | hidden | drawn |
| `on` | `on` | `off` | drawn | hidden |
| `on` | `off` | `off` | hidden | hidden |
| `off` | any | any | hidden | hidden |

| Value | Effect |
| --- | --- |
| `on` | the frames are drawn |
| `off` | every framed row is drawn as Claude Code draws it, the status line bare (whatever `chatBorders` and `statuslineBorders` say) |

| Usage | Result |
| --- | --- |
| `/daiver-prompt-view:chat:show-borders on` | `The frames are now shown.` |
| `/daiver-prompt-view:chat:show-borders off` | `The frames are now hidden.` |
| `/daiver-prompt-view:chat:show-borders` | toggles: `The frames are now hidden.` when they were on, `The frames are now shown.` when they were off |
| `/daiver-prompt-view:chat:show-borders maybe` | nothing changes: `Usage: /daiver-prompt-view:chat:show-borders [on|off]` |

### `/daiver-prompt-view:chat:show-chat-borders [on|off]`

Option `chatBorders` (Show the chat's frames), default `true` (`on`). It
covers the transcript's frames alone (your prompts, Claude's replies, tool
calls, the spinner, command output) and is separate from `borders`: they are
drawn while both are on, so `borders` off hides them whatever this one says,
and this one off hides them while the status line's frame stays.

| Value | Effect |
| --- | --- |
| `on` | the transcript's rows are framed (while `borders` is on too) |
| `off` | every framed row is drawn as Claude Code draws it, the status line's frame as `borders` and `statuslineBorders` say |

| Usage | Result |
| --- | --- |
| `/daiver-prompt-view:chat:show-chat-borders on` | `The chat's frames are now shown.` |
| `/daiver-prompt-view:chat:show-chat-borders off` | `The chat's frames are now hidden.` |
| `/daiver-prompt-view:chat:show-chat-borders` | toggles: `The chat's frames are now hidden.` when they were on, `The chat's frames are now shown.` when they were off |
| `/daiver-prompt-view:chat:show-chat-borders maybe` | nothing changes: `Usage: /daiver-prompt-view:chat:show-chat-borders [on|off]` |

### `/daiver-prompt-view:chat:show-statusline-borders [on|off]`

Option `statuslineBorders` (Show the status line's frame), default `true`
(`on`). It covers the status line's frame alone and is separate from `borders`:
the frame is drawn while both are on, so `borders` off hides it whatever this
one says, and this one off hides it while the transcript's frames stay.

| Value | Effect |
| --- | --- |
| `on` | the status line is framed (while `borders` is on too) |
| `off` | the status line is bare, the transcript's frames as `borders` says |

| Usage | Result |
| --- | --- |
| `/daiver-prompt-view:chat:show-statusline-borders on` | `The status line's frame is now shown.` |
| `/daiver-prompt-view:chat:show-statusline-borders off` | `The status line's frame is now hidden.` |
| `/daiver-prompt-view:chat:show-statusline-borders` | toggles: `The status line's frame is now hidden.` when it was on, `The status line's frame is now shown.` when it was off |
| `/daiver-prompt-view:chat:show-statusline-borders maybe` | nothing changes: `Usage: /daiver-prompt-view:chat:show-statusline-borders [on|off]` |

### `/daiver-prompt-view:chat:border-style [dotted|line]`

Option `borderStyle` (Frame style), default `dotted`. It sets how every frame
the mod draws looks: the transcript's (your prompts, Claude's replies, tool
calls, the spinner, command output), the history pane's and the status line's.
Whether a frame is drawn at all is still up to `borders`, `chatBorders` and
`statuslineBorders`.

| Value | What the frames look like |
| --- | --- |
| `dotted` (default) | a dashed line with open corners: `╌` across, `╎` down |
| `line` | a solid line with rounded corners: `─` across, `│` down, `╭╮╰╯` |

```
 ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌        ╭───────────────────╮
╎ fix the login bug ╎       │ fix the login bug │
 ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌        ╰───────────────────╯
       dotted                       line
```

| You type | What happens |
| --- | --- |
| `/daiver-prompt-view:chat:border-style line` | every frame is redrawn at once: `The frames are now line.` |
| `/daiver-prompt-view:chat:border-style dotted` | every frame is redrawn at once: `The frames are now dotted.` |
| `/daiver-prompt-view:chat:border-style` | shows the current one: `Frame style: dotted (one of dotted, line)` |
| `/daiver-prompt-view:chat:border-style wavy` | nothing changes: `Usage: /daiver-prompt-view:chat:border-style [dotted|line]` |

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
