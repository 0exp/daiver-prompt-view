# daiver-prompt-view

A Claude Code mod that ships a multi-line status line for under the prompt:
model, session, modes, the session's agents, usage bars, git state,
and Clawd, Claude's mascot, at the right edge.

```
Opus 5.5 -> [demo] (sid:419e75ee) <stime:1h23m> <automemory:on> <in:1.2M·out:85k·cash:$4.31>
(effort:high) (outputstyle:Proactive) (thinkmode:thinking) (fastmode:false)                      ▐▛███▜▌
⚙ main:thinking (1m13s) │ agents:2 (sub:1 sh:1 mon:0) -> pending:0 running:2 waiting:0 idle:0  ▝▜█████▛▘
-> Explore (time:1m01s) [Find lock index usages]                                                 ▘▘ ▝▝
ctx ███░░░░░░░ 37% (74k/200k) | lmt ████░░░░░░ 43% | rst ██████░░░░ 1h56m (at 17h48m) | pch ████████░░ 85%  2.1.303
 (08d3788a) main [+#?] | ~/Projects/demo
```

It joins two former mods, [agent-prompt-view](https://github.com/0exp/claude-agent-prompt-view)
and [agent-count](https://github.com/0exp/claude-agent-count), with their history.

## The lines

The whole status line sits in a frame (dashed by default, a solid rounded line with `borderStyle` `line`) in the theme's `frame` color
(Clawd orange in `default`): as wide as the terminal when its width is known,
else as wide as the widest line, Clawd inside it at the right border.

1. Model, session name, short session id, session time (`stime`, from the
   transcript's creation time), whether auto memory is on in this session
   (`automemory`, written by the hooks module: the status line's input has no
   such field; read from the settings files themselves when a plugin above
   refuses the mod's settings read, and `?` when nothing could be read, never a
   guessed `on`), and last the session's tokens and cost: `in` input and `out`
   output tokens of every request so far, subagents included, summed from the
   session's transcripts (`k` thousands, `M` millions), `cash`
   the cost in dollars at API prices, subagents included (on a subscription an
   estimate, not a bill); `<in:0·out:0·cash:$0.00>` before the first request.
   Hidden with the `statuslineUsage` option off
   (`/daiver-prompt-view:statusline:show-usage`).
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

   The line is always there: while a session has no state of its own yet (its
   start hook has not run, nothing was launched), the status line shows an idle
   main loop and zeros everywhere:
   `⚙ main:idle │ agents:0 (sub:0 sh:0 mon:0) -> pending:0 running:0 waiting:0 idle:0`.

   Agents come from `$.agent.list()`, polled every second. Shells and monitors
   are tracked from their `Bash` / `Monitor` calls and dropped on their task
   notification, `TaskStop`, or the `Stop` hook's `background_tasks` snapshot.
4. Bars: `ctx` context window used, with its size in tokens in brackets
   (`37% (74k/200k)`: the last request's input over the window, `k` thousands,
   `M` millions; `(0/200k)` before the first request), `lmt` 5-hour rate limit used, `rst` time to
   its reset and, in orange, its local time (24-hour `HHhMMm`), `pch` prompt
   cache hits of the last request. All four show from the start: before the
   first response (or once the 5-hour window has reset) `lmt` is 0%, `rst` a
   whole 5h00m window and `pch` 0%.
5. Git: short sha, branch, flags (`+` staged, `#` untracked, `?` unstaged),
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
into the Matrix's rain of glyphs and back. By default it plays the Matrix
(the `clodikAnimation` option); with `random`, a new random animation starts
every 8 seconds. A frame per refresh.

## Your prompts, Claude's replies, tool calls, the spinner and command output

All of these frames, and the status line's, follow the `borders` option
(`/daiver-prompt-view:chat:show-borders`, see below); these ones also follow
`chatBorders` (`chat:show-chat-borders`), the status line's `statuslineBorders`
(`chat:show-statusline-borders`). How they are drawn, dashed (the default) or a
solid line, is the `borderStyle` option (`chat:border-style`).

Every prompt you send is drawn in the transcript inside a frame in the
theme's `prompt` color (Clawd orange in `default`). Only your own prompts are
framed: background task notifications and messages from other sessions keep the
plain row. Inside the frame the prompt is plain text, without the highlight the
bare row paints under it. The frame is drawing only, the stored message is
untouched, and a theme switch redraws it at once.

Claude's replies get a frame of their own, in the theme's `reply` color (neon
blue in `default`), around each text block as the transcript draws it. A
markdown table in a reply is fitted inside that frame on the terminal: each
column as wide as its widest cell while the room allows, its cells wrapping when
the frame is narrower, so its right edge and corners stay in place. So do
the tool calls' rows (`Bash(ls)` and the result), in the theme's `tool` color
(dark violet in `default`; a call the transcript shows nothing for gets no
frame, in the fullscreen layout, where the terminal says how tall a row is), and the spinner line of a running turn
(`Sauteing… (12s)`), in the theme's `spinner` color (the output style's yellow in `default`), and the output row
of a slash command (`/reload-plugins`, `/cost`, this mod's own commands), in the
theme's `command` color (gray in `default`).

In the fullscreen terminal every framed box of the transcript (your prompts,
Claude's replies, tool calls, slash commands' output) carries a copy button,
`⧉`, in its top right corner. A click puts the box's own text on the clipboard,
its markdown as written, with nothing of the frame:

| Frame | A click on `⧉` copies |
| --- | --- |
| Your prompt | the prompt as you typed it |
| A block of Claude's reply | that block's text, its markdown (`**bold**`, tables, fences) as written |
| A Bash call | `$ <command>`, the whole command, then a blank line and its output (stdout, then stderr) once it ended |
| Any other tool call | the call as the history pane names it (`Read(/a/b.ts)`), then a blank line and its result (text as it is, else JSON) |
| A slash command's output | the text the command printed |

For a moment after the click the corner shows `✓`. On the main screen, which
takes no clicks, and with the frames hidden there is no button.

## Toasts

Claude Code's own toast (on its notification bar, for 4 seconds) when your work
is done, so a look at the terminal is enough. Off by default: the `toasts`
option (`/daiver-prompt-view:toasts:show on`) turns them on.

| Toast | When |
| --- | --- |
| `Task complete` | Claude's turn ends with its answer: the task is done, or Claude waits for your reply. An interrupted turn, an API error and a subagent's turn raise none |
| `/-Command complete` | a slash command you ran has finished (a built-in one, another plugin's or this mod's own); a command that starts a turn for Claude ends with `Task complete` too |

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
| `/daiver-prompt-view:clodik:animation` | an animation name, or nothing | `matrix` | Pick the animation Clawd plays; with no argument, shows the current one and the list |
| `/daiver-prompt-view:view:theme` | a theme name, or nothing | `default` | Pick the colors of every line (the agents line's included); with no argument, shows the current one and the list |
| `/daiver-prompt-view:history:show` | `on`, `off`, or nothing | `off` | Show (`on`) or hide (`off`) the pane with this session's prompts; with no argument, toggles |
| `/daiver-prompt-view:toasts:show` | `on`, `off`, or nothing | `off` | Show (`on`) or hide (`off`) the toasts (`Task complete`, `/-Command complete`); with no argument, toggles |
| `/daiver-prompt-view:history:mode` | `fullstory`, `questions`, `answers`, or nothing | `fullstory` | Pick what the history pane lists: prompts, commands and Claude's answers, prompts and commands alone, or answers alone; with no argument, shows the current one and the list |
| `/daiver-prompt-view:chat:show-borders` | `on`, `off`, or nothing | `on` | Show (`on`) or hide (`off`) the frames around prompts, replies, tool calls, the spinner, command output and the status line; with no argument, toggles |
| `/daiver-prompt-view:chat:show-chat-borders` | `on`, `off`, or nothing | `on` | Show (`on`) or hide (`off`) the frames around prompts, replies, tool calls, the spinner and command output, the status line's left as it is; with no argument, toggles |
| `/daiver-prompt-view:chat:show-statusline-borders` | `on`, `off`, or nothing | `on` | Show (`on`) or hide (`off`) the frame around the status line alone; with no argument, toggles |
| `/daiver-prompt-view:chat:border-style` | `dashed`, `line`, or nothing | `dashed` | Draw every frame dashed (`dashed`) or as a solid line (`line`); with no argument, shows the current one and the list |
| `/daiver-prompt-view:mod:doctor` | nothing | (none) | Check what of the mod works in this session: the hooks a plugin above may pass by, the status line padding, where auto memory is read from |
| `/daiver-prompt-view:statusline:show-usage` | `on`, `off`, or nothing | `on` | Show (`on`) or hide (`off`) the session's tokens and cost at the end of the status line's first line; with no argument, toggles |

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

Option `clodikAnimation` (Clawd's animation), default `matrix`.

| Value | Animation |
| --- | --- |
| `random` | a random one of the others, a new one every 8 seconds, never the same twice in a row |
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
| `matrix` (default) | fall to pixels, then the Matrix's rain of glyphs runs down the canvas, then back |

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
| `default` (default) | white, gray, fuchsia (ctx), lavender (the context's size beside it), sky blue (lmt), light green (rst), Clawd orange, gray-green (pch), khaki (sha), violet (branch), coral (flags), light green (+added), coral (-removed), Clawd orange (the matrix rain, the frame around your prompts, in the chat and in the history pane, and the frame around the status line too), neon blue (the frame around Claude's replies, in the chat and in the history pane), dark violet (the frame around the tool calls, in the chat and in the history pane), yellow (the frame around the spinner, as the output style), gray (the frame around a command's output), Clawd orange (the prompt history pane's frame too), fuchsia (the history message's frame under the pointer, as the ctx bar), near black (the history pane's background) |

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
| `history` | Show the prompt history pane | boolean | `false` | `true`, `false` | `history:show` |
| `toasts` | Show the toasts | boolean | `false` | `true`, `false` | `toasts:show` |
| `historyMode` | Prompt history pane's messages | choice | `fullstory` | `fullstory`, `questions`, `answers` | `history:mode` |
| `borders` | Show the frames | boolean | `true` | `true`, `false` | `chat:show-borders` |
| `chatBorders` | Show the chat's frames | boolean | `true` | `true`, `false` | `chat:show-chat-borders` |
| `statuslineBorders` | Show the status line's frame | boolean | `true` | `true`, `false` | `chat:show-statusline-borders` |
| `statuslineUsage` | Show the session's tokens and cost | boolean | `true` | `true`, `false` | `statusline:show-usage` |
| `borderStyle` | Frame style | choice | `dashed` | `dashed`, `line` | `chat:border-style` |
| `clodik` | Show Clawd | boolean | `true` | `true`, `false` | (none) |
| `clodikAnimate` | Animate Clawd always | boolean | `false` | `true`, `false` | `clodik:animate` |
| `clodikAnimation` | Clawd's animation | choice | `matrix` | `random`, `jump`, `spin`, `sway`, `blink`, `cheer`, `wave`, `stretch`, `hop`, `tap`, `shiver`, `pixels`, `matrix` | `clodik:animation` |
| `theme` | Color theme | choice | `default` | `default` | `view:theme` |
| `statuslinePadding` | Status line padding | number | `-1` | whole numbers from `-2` to `20` | (none) |

For example, in `~/.claude/settings.json`:

```json
"pluginConfigs": {
  "daiver-prompt-view@daiver-prompt-view": {
    "options": {
      "history":           false,
      "historyMode":       "fullstory",
      "toasts":            false,
      "borders":           true,
      "chatBorders":       true,
      "statuslineBorders": true,
      "statuslineUsage":   true,
      "borderStyle":       "dashed",
      "clodik":            true,
      "clodikAnimate":     false,
      "clodikAnimation":   "pixels",
      "theme":             "default",
      "statuslinePadding": -1
    }
  }
}
```

### Prompt history pane

With `history` on, a pane at the right (above the prompt in a narrow terminal)
lists the session's story, newest first, each message on its own: the time
(`HH:MM:SS`, local) on top, the text under. What it lists is the `historyMode`
option (`/daiver-prompt-view:history:mode`):

| `historyMode` | The pane lists | Header |
| --- | --- | --- |
| `fullstory` (default) | your prompts and slash commands pushed to the right (8 columns in from the left) and Claude's answers pushed to the left (8 columns in from the right), by time, as in a chat | `History (n)` |
| `questions` | your prompts and slash commands alone, the pane's whole width | `Prompts (n)` |
| `answers` | Claude's answers alone, the pane's whole width | `Answers (n)` |

Each message is framed in the color the transcript frames it with: a prompt in
the theme's `prompt` color (its whole text), a slash command in the `command`
color (`/name args`, its output's first 3 lines dim under it; a built-in
command, another plugin's or this mod's own, read on the session start from
the transcript file and joining as each one runs), Claude's text in the `reply` color
(its first 8 lines, `…` for the rest), a tool call in the `tool` color, one
line with the tool and its main argument (`Bash(ls -la)`, `Read(/src/a.ts)`).
Answers are Claude's own on the main conversation (a subagent's are left out),
read on the session start from the session's transcript file and joining as
the session stores them. A click on a message (or Enter on it while the pane
has the keyboard) scrolls the transcript to it: a prompt's or a text's row, a
tool call's own row; under the pointer a message's frame turns the theme's `hover` color
(the ctx bar's fuchsia in `default`) and the other style (dashed, its dots, over
solid frames; solid over dashed ones), and turns back as the pointer leaves; the pane's body sits on the theme's
`paneBackground`, darker than the terminal's own (near black in `default`) (the row's id comes with the row as the session stores it, or from the
session's transcript file for prompts sent before the mod loaded); a prompt
or answer whose row cannot be found is noted in the debug log, nothing on screen. Slash commands are left out. On
the session start the list is read from Claude Code's own prompt log
(`~/.claude/history.jsonl`, this session's rows), so prompts sent before the mod
loaded are there too; from then on each prompt joins as it is sent. The list
lives in the session's state, so it survives a reload of the mod. The wheel
or the scroll keys move the list by messages while the header with the `×`
stays put (`↑3` after the count says how many newer messages are above); a
scrollbar at the list's right edge shows where it stands. A click on the
scrollbar moves the list there, the thumb centered on the row clicked: the top
for the newest messages, the bottom for the oldest, the middle for the middle
of the story; the row under the pointer is highlighted. `▲` over the
scrollbar and `▼` under it move the list a message at a time, newer and older;
each is dim once the list is at that end. While the list is empty the pane's body
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

### `/daiver-prompt-view:toasts:show [on|off]`

Option `toasts` (Show the toasts), default `false` (`off`).

| Value | Effect |
| --- | --- |
| `on` | `Task complete` and `/-Command complete` show as Claude Code's toasts |
| `off` | no toasts |

| Usage | Result |
| --- | --- |
| `/daiver-prompt-view:toasts:show on` | `The toasts are now shown.` |
| `/daiver-prompt-view:toasts:show off` | `The toasts are now hidden.` |
| `/daiver-prompt-view:toasts:show` | toggles: `The toasts are now shown.` when they were off, `The toasts are now hidden.` when they were on |
| `/daiver-prompt-view:toasts:show maybe` | nothing changes: `Usage: /daiver-prompt-view:toasts:show [on\|off]` |

### `/daiver-prompt-view:history:mode [fullstory|questions|answers]`

Option `historyMode` (Prompt history pane's messages), default `fullstory`.
The pane draws again at once, scrolled back to the newest message.

| Value | Effect |
| --- | --- |
| `fullstory` | your prompts and commands at the right and Claude's answers and tool calls at the left, by time |
| `questions` | your prompts and commands alone, the pane's whole width |
| `answers` | Claude's answers and tool calls alone, the pane's whole width |

| Usage | Result |
| --- | --- |
| `/daiver-prompt-view:history:mode questions` | `The history pane now lists your prompts and commands alone.` |
| `/daiver-prompt-view:history:mode answers` | `The history pane now lists Claude's answers alone.` |
| `/daiver-prompt-view:history:mode fullstory` | `The history pane now lists your prompts, your commands and Claude's answers.` |
| `/daiver-prompt-view:history:mode` | shows the current one: `The history pane lists: fullstory (one of fullstory, questions, answers)` |
| `/daiver-prompt-view:history:mode everything` | nothing changes: `Usage: /daiver-prompt-view:history:mode [fullstory\|questions\|answers]` |

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

### `/daiver-prompt-view:mod:doctor`

No option and no value: it reports. An organization may seat a security plugin
above the user's plugins (`cc-plugin-sec-default`) that sends some events on
past this mod; the command says which parts of the mod that touches, one line
each:

| Line | What it says |
| --- | --- |
| `settings.read` | checked now: `answered by the mod` (the padding option applies), `passed on past the mod by a plugin above` (the padding option cannot apply, the frame follows `settings.json`), or `refused` (auto memory is read from the settings files) |
| `prompt.section` | how many times it ran since the mod loaded; it runs with each turn, so `not seen yet` after a turn means a plugin above passes it by: a session whose auto memory is blocked is not told apart then |
| `classic.Stop` | the same; it runs as a turn ends and drops finished shells and monitors from the agents line |
| `padding` | the `statuslinePadding` option and the padding the status line is drawn with |
| `auto memory` | `on`, `off` or `?`, and where it was read from: the merged settings, the settings files, `CLAUDE_CODE_DISABLE_AUTO_MEMORY`, `/pause-memory`, or nothing |

| Usage | Result |
| --- | --- |
| `/daiver-prompt-view:mod:doctor` | the report, for example:<br>`daiver-prompt-view doctor`<br>`settings.read: answered by the mod (checked now): the padding option applies`<br>`prompt.section: ran 3 times; it tells a session whose auto memory is blocked`<br>`classic.Stop: ran 3 times; it drops finished shells and monitors from the agents line`<br>`padding: statuslinePadding -1, drawn -1`<br>`auto memory: on, from the merged settings` |
| `/daiver-prompt-view:mod:doctor now` | nothing is checked: `Usage: /daiver-prompt-view:mod:doctor` |

### `/daiver-prompt-view:statusline:show-usage [on|off]`

Option `statuslineUsage` (Show the session's tokens and cost), default `true`
(`on`). It covers the segment at the end of the status line's first line: the
input and output tokens of every request in the session, subagents included,
and the session's cost in dollars at API prices.

| Value | Effect |
| --- | --- |
| `on` | the first line ends with the segment: `Opus 5.5 -> [demo] (sid:419e75ee) <stime:1h23m> <automemory:on> <in:1.2M·out:85k·cash:$4.31>` |
| `off` | the first line ends where it did before: `Opus 5.5 -> [demo] (sid:419e75ee) <stime:1h23m> <automemory:on>`, and the session's transcripts are not read |

| Usage | Result |
| --- | --- |
| `/daiver-prompt-view:statusline:show-usage on` | `The session's tokens and cost are now shown.` |
| `/daiver-prompt-view:statusline:show-usage off` | `The session's tokens and cost are now hidden.` |
| `/daiver-prompt-view:statusline:show-usage` | toggles: `The session's tokens and cost are now hidden.` when they were shown, `The session's tokens and cost are now shown.` when they were hidden |
| `/daiver-prompt-view:statusline:show-usage maybe` | nothing changes: `Usage: /daiver-prompt-view:statusline:show-usage [on\|off]` |

### `/daiver-prompt-view:chat:border-style [dashed|line]`

Option `borderStyle` (Frame style), default `dashed`. It sets how every frame
the mod draws looks: the transcript's (your prompts, Claude's replies, tool
calls, the spinner, command output), the history pane's and the status line's.
Whether a frame is drawn at all is still up to `borders`, `chatBorders` and
`statuslineBorders`.

| Value | What the frames look like |
| --- | --- |
| `dashed` (default) | a dashed line with open corners: `╌` across, `╎` down |
| `line` | a solid line with rounded corners: `─` across, `│` down, `╭╮╰╯` |

```
 ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌        ╭───────────────────╮
╎ fix the login bug ╎       │ fix the login bug │
 ╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌        ╰───────────────────╯
       dashed                       line
```

| You type | What happens |
| --- | --- |
| `/daiver-prompt-view:chat:border-style line` | every frame is redrawn at once: `The frames are now line.` |
| `/daiver-prompt-view:chat:border-style dashed` | every frame is redrawn at once: `The frames are now dashed.` |
| `/daiver-prompt-view:chat:border-style` | shows the current one: `Frame style: dashed (one of dashed, line)` |
| `/daiver-prompt-view:chat:border-style wavy` | nothing changes: `Usage: /daiver-prompt-view:chat:border-style [dashed|line]` |

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

The padding comes from the mod: Claude Code draws the status line 2 columns in
from each edge of the terminal and adds `statusLine.padding` to that, and while
`statusLine` runs this script the mod sets that padding to its
`statuslinePadding` option (`-1` by default), in the settings as Claude Code
merges them: nothing is written to `settings.json`, and a `padding` there is
overridden. The frame is built for the padding Claude Code really draws with,
read back from the merged settings every few seconds. Where a plugin seated
above this one (an organization's security plugin) passes the settings on past
the mod, the option cannot reach Claude Code: the status line keeps the
`statusLine.padding` of `settings.json` (`0` with none), the frame still fits
it, and the debug log says the option is not applied; set the same value in
`settings.json` to have it there. Another status line's `padding` is left as it is.

| `statuslinePadding` | Free columns on each side of the frame |
| --- | --- |
| `-1` (default) | 1 |
| `-2` | 0: from edge to edge |
| `0` | 2, Claude Code's own indent |
| `1` | 3 |

Requires `jq` and `git`; the branch glyph needs a Nerd Font. The script uses
macOS `stat -f`; elsewhere `stime` falls back to the session's duration.

What the mod keeps in `~/.claude/daiver-prompt-view/`: `statusline.sh`, `config`
(the options), `theme.sh` (the active theme's colors), `agents/<session_id>`, `agents.idle` (the agents line of a session with no state yet),
and `automemory/<session_id>`.

## Develop

Development rules (docs for every option and command, typeahead for every
command's values, a `CHANGELOG.md` entry for every change) are in
`.claude/CLAUDE.md`. What changed in each version is in `CHANGELOG.md`.

```
hooks/register.ts          the hooks module: options, the one session.start, typeahead
hooks/features/            statusline, agents, clodik, view: a file per feature
hooks/shared/              config, themes, commands, files, options
commands/<feature>/*.md    the slash commands
statusline/                the status line script (POSIX sh + jq + git)
tests/                     claude plugin test .
skills/daiver-prompt-view/ how Claude checks, changes, reloads and releases the mod
CHANGELOG.md               what changed in each version (Keep a Changelog)
```

```
claude --plugin-dir .          # run a session with the mod loaded from this folder
claude plugin validate .       # manifest, marketplace and hooks module
claude plugin test .           # the tests
```
