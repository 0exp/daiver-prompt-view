# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.57.0] - 2026-11-23

### Changed

- The usage bars are a block of their own inside the status line, between two lines drawn across it with blank ends, so the block looks rounded: `ctx` and `pch` on the first line, `lmt` and `rst` on the second, their second columns lined up.
- Clawd has a block of his own at the right of the status line, set apart by a line of the frame from top to bottom.

## [1.56.0] - 2026-11-23

### Added

- The Fable limit's reset date and time show after `rst`'s reset time in the same purple brackets, as `rst ██████░░░░ 1h56m (at 17:48) (fable:27-11-2026 02:00)`, whenever the Fable limit is shown.

## [1.55.0] - 2026-11-23

### Added

- The weekly Fable limit used shows on the status line in purple brackets of its own after the weekly limit, as `lmt ████░░░░░░ 43% (12%) (fable:23%)`, with its reset date and time when `statuslineWeekReset` is on; it is left out when the account has no Fable limit.

## [1.54.3] - 2026-11-22

### Fixed

- With several sessions open, the 5-hour and weekly limits on the status line read the same in all of them: each shows the newest figures any session has received, so an idle session no longer shows a lower, outdated percentage.

## [1.54.2] - 2026-11-21

### Fixed

- With several sessions open, turning the frames (or another status line option) on or off in one no longer makes the status line's frame in the others flicker on and off: each session's status line follows its own options.

## [1.54.1] - 2026-11-21

### Changed

- The session's cost at the end of the status line's first line is labelled `cost:` instead of `cash:`, as `<in:1.2M·out:85k·cost:$4.31>`.

## [1.54.0] - 2026-11-21

### Added

- The `statuslineWeekReset` option and `/daiver-prompt-view:statusline:show-week-reset [on|off]` show or hide the weekly limit's reset date and time in `lmt`'s brackets.

### Changed

- By default the weekly limit shows only its percentage, as `(12%)`; the reset date and time appear with the new option on.

## [1.53.0] - 2026-11-21

### Changed

- The weekly limit's reset after `lmt` shows the local time of day after the date, as `(12% -> 25-11-2026 09:30)`.

## [1.52.1] - 2026-11-20

### Changed

- The 5-hour limit's reset time after `rst` reads as `(at 17:48)` instead of `(at 17h48m)`.

## [1.52.0] - 2026-11-20

### Added

- The status line shows the weekly limit beside the 5-hour one: its percentage used and the date it resets, as dd-mm-yyyy, in brackets after `lmt`, as `(12% -> 25-11-2026)`.

## [1.51.5] - 2026-11-19

### Fixed

- The status line keeps updating, its times included, while many subagents are at work: only the transcripts that grew are read for the token totals.

## [1.51.4] - 2026-11-19

### Fixed

- The session's token totals are counted again only when a transcript has grown: while the session and its subagents write nothing, the status line reads none of them.

## [1.51.3] - 2026-11-19

### Fixed

- The status line takes about a tenth of the CPU it took: with many sessions open at once it no longer loads the computer, and while a session stands idle its last drawing is shown again, refreshed at least every 5 seconds.
- A session name or folder with a backslash in it is shown as written, not cut or garbled.

## [1.51.2] - 2026-11-18

### Changed

- A subagent's current work, in the parentheses at the end of its line, is shown in gray.

## [1.51.1] - 2026-11-18

### Fixed

- The status line keeps updating in a long session with many subagents at work: the session's token totals are counted only from what was added since the last refresh, instead of reading every transcript again each second.

## [1.51.0] - 2026-11-17

### Added

- The frame around the row of buttons turns a lighter red while the pointer is over it, and back as the pointer leaves.

## [1.50.1] - 2026-11-17

### Changed

- The mod's description names what it gives you: live agents, usage limits and git state under the prompt, a framed chat with copy buttons, and the prompt history pane.

## [1.50.0] - 2026-11-17

### Added

- The `agentActivityLength` option: how many characters of a subagent's current work its status line row shows (40 by default, 0 hides it).

## [1.49.0] - 2026-11-17

### Added

- Each subagent's line in the status line shows what it works on now, its last tool call (`Bash(git status)`, `Read(/path)`), in parentheses after its task.

## [1.48.2] - 2026-11-17

### Fixed

- A resumed or forked session shows its subagents, shells and monitors in the agents line again: the line followed the session's old id and stayed idle.

## [1.48.1] - 2026-11-16

### Changed

- The history pane shows a tool call as one line again (its first line, up to 80 characters, `…` past them), as before 1.47.3; its copy button still copies the call with its whole result.

## [1.48.0] - 2026-11-16

### Added

- A group of tool calls folded into one line (`Ran 5 commands`) sits in the tool calls' frame too; expanded, each call keeps its own.

## [1.47.3] - 2026-11-16

### Changed

- The history pane shows a tool call's command whole: a multi-line one with every line and a long one in full, instead of its first line cut with `…`.

## [1.47.2] - 2026-11-16

### Changed

- The row of buttons above the prompt sits in a frame of its own color in the theme (a muted dark red in the default one), hidden with the other frames.

## [1.47.1] - 2026-11-16

### Fixed

- Closing the history pane with its × turns the history option off, so the `≡ history` button shows `off` at once.

## [1.47.0] - 2026-11-16

### Added

- A copy button on every message of the history pane, as on the chat's boxes: it copies the whole message (a prompt, a command with its output, Claude's whole text, a tool call with its result), not the short form the pane shows.

## [1.46.2] - 2026-11-16

### Fixed

- With several sessions open, an option changed in one (the frames, the theme, Clawd, ...) holds in the status line of every session, instead of flickering back to another session's old value.

## [1.46.1] - 2026-11-16

### Changed

- The buttons above the prompt are always gray, on and off alike, in a color of their own in the theme.

## [1.46.0] - 2026-11-16

### Added

- A row of buttons above the prompt: `▣ borders` shows or hides the frames, `≡ history` opens or closes the prompt history pane, each showing where it stands; a click or its key (`b`, `h`) presses it.
- An option and a command to hide or show that row of buttons.
- The doctor tells whether the row of buttons is drawn, or which part of it a plugin above takes away.

## [1.45.0] - 2026-11-14

### Added

- The doctor names the plugin that skips the mod's hooks, as Claude Code's notices in the session say, and tells who can let those hooks through.

## [1.44.0] - 2026-11-14

### Added

- A command that checks what of the mod works in the session: which of its hooks an organization's plugin passes by, the status line padding drawn, and where auto memory is read from.

## [1.43.3] - 2026-11-14

### Fixed

- `automemory` on the first line is read from the settings files when an organization's plugin refuses the mod's settings read, and shows `?` when nothing could be read instead of a guessed `on`.

## [1.43.2] - 2026-11-14

### Fixed

- The status line's frame fits the padding Claude Code really draws with, also when an organization's plugin keeps the padding option from applying; the debug log then says so.

## [1.43.1] - 2026-11-14

### Changed

- The development rules: a change is committed and pushed only with the maintainer's yes, a commit per finished feature and one push for a set of them.

## [1.43.0] - 2026-11-14

### Changed

- Clawd plays the Matrix animation by default instead of a random one; `random` stays a choice.

## [1.42.0] - 2026-11-14

### Added

- A click on the history pane's scrollbar scrolls the list there, the row under the pointer highlighted.
- Arrows at the ends of the history pane's scrollbar move the list a message at a time.

## [1.41.1] - 2026-11-14

### Changed

- The context's size beside the context bar is lavender instead of Clawd orange in the default theme.

## [1.41.0] - 2026-11-14

### Added

- An option and a command to show or hide the session's tokens and cost on the first line, shown by default; with no argument the command toggles them.

## [1.40.1] - 2026-11-14

### Fixed

- `in` and `out` on the first line count the whole session's tokens, subagents included, instead of the last request's alone.

## [1.40.0] - 2026-11-14

### Added

- The context bar shows the context's size in tokens beside its percentage, as `37% (74k/200k)`.
- The context's size beside the context bar has its own theme color, Clawd orange by default, as the 5-hour window's reset time.
- The first line ends with the session's tokens and cost, as `<in:1.2M·out:85k·cash:$4.31>`.

## [1.39.2] - 2026-11-14

### Changed

- Bumped version to 1.39.2.

## [1.39.1] - 2026-11-14

### Changed

- The copy button `⧉` stands a column in from the frame's right border instead of pressed against it.

## [1.39.0] - 2026-11-14

### Added

- The copy button `⧉` on every framed box in the transcript: a tool call's frame copies the call and its result (a Bash call as `$ command` with its output), a slash command's frame copies its output.

## [1.38.0] - 2026-11-13

### Added

- A copy button `⧉` in the top right corner of your prompts' and Claude's replies' frames: a click copies the message's text, without the frame, and shows `✓` for a moment (in the fullscreen terminal).

## [1.37.5] - 2026-11-13

### Fixed

- A tool call the transcript shows nothing for no longer leaves an empty frame of two lines; its frame comes back once the call shows something.

## [1.37.4] - 2026-11-13

### Fixed

- Tables in Claude's framed replies fit inside the frame: their right edge is no longer cut and their corners no longer wrap to the next line.

## [1.37.3] - 2026-11-12

### Fixed

- A running subagent's tool calls under its row show as text again, not as two empty frame lines.

## [1.37.2] - 2026-11-12

### Added

- This changelog, and the rule that every change, a minor one too, is a new version with its entry here.

## [1.37.1] - 2026-11-12

### Changed

- Toasts are off by default.

## [1.37.0] - 2026-11-12

### Added

- The history pane lists the slash commands you run, with a glimpse of their output.

## [1.36.3] - 2026-11-12

### Added

- Toasts when Claude finishes a task and when a slash command completes, with an option and a command to turn them on or off.

## [1.34.0] - 2026-11-12

### Changed

- A history message under the pointer changes its frame style as well as its color.

## [1.33.3] - 2026-11-12

### Changed

- The history pane's hover color has its own theme setting; message frames share their colors with the chat.

## [1.33.2] - 2026-11-12

### Added

- Claude's answers and tool calls in the history pane, laid out as a chat, and a mode to show the whole story, prompts only or answers only.

## [1.32.0] - 2026-11-12

### Added

- The status line's padding is a setting of the mod, so it no longer has to be set by hand.

## [1.31.5] - 2026-11-12

### Fixed

- No blank line under the top border of reply, tool call and spinner frames.

## [1.31.0] - 2026-11-12

### Changed

- The status line's frame follows the status line's padding.

## [1.30.0] - 2026-11-12

### Changed

- The agents line is always shown, idle until the session has agents of its own.

### Removed

- The RAM/CPU line.

## [1.27.0] - 2026-11-12

### Changed

- The dotted frame style is named dashed.

## [1.26.0] - 2026-11-12

### Added

- A choice of frame style: dotted or a solid line.

## [1.25.0] - 2026-11-09

### Added

- The chat's frames can be turned off on their own.

## [1.24.0] - 2026-11-09

### Added

- The status line's frame can be turned off on its own.

## [1.21.3] - 2026-11-09

### Fixed

- Reply, tool call and spinner frames draw Claude Code's own rows unchanged.

## [1.21.2] - 2026-11-09

### Fixed

- No blank line under the top border of reply frames.

## [1.21.1] - 2026-11-09

### Changed

- The mod raises no toasts; what it has to say goes to the debug log.

## [1.21.0] - 2026-11-09

### Added

- One switch for every frame, the status line's included.

## [1.20.1] - 2026-11-09

### Changed

- The spinner's frame takes the output style's color.

## [1.20.0] - 2026-11-09

### Added

- A scrollbar in the history pane.

### Changed

- An option that cannot be saved holds for the session and says so.

## [1.19.0] - 2026-11-09

### Changed

- The history pane's header stays in place while its list scrolls.

## [1.18.1] - 2026-11-09

### Changed

- The history pane sits on a darker background.

## [1.18.0] - 2026-11-09

### Added

- The history message under the pointer is highlighted.

## [1.17.2] - 2026-11-09

### Changed

- The history pane shows the newest prompt first.

## [1.17.1] - 2026-11-09

### Fixed

- A press on a history message finds its prompt even when it is off screen.

## [1.17.0] - 2026-11-09

### Added

- A press on a history message scrolls the chat to that prompt.

## [1.16.1] - 2026-11-09

### Changed

- The history pane's own frame shows only while it is empty.

## [1.16.0] - 2026-11-09

### Changed

- Each prompt in the history pane is a framed message with its time.

## [1.15.0] - 2026-11-09

### Added

- The history pane lists every prompt of the session, earlier ones included.

## [1.14.0] - 2026-11-09

### Added

- The prompt history pane, with a command to show or hide it.

## [1.13.1] - 2026-11-09

### Changed

- The spinner's frame is green in the default theme.

## [1.13.0] - 2026-11-09

### Added

- Slash command output in a frame.

## [1.12.1] - 2026-11-09

### Fixed

- No blank line under the top border of tool call and spinner frames.

## [1.12.0] - 2026-11-09

### Added

- The spinner line in a frame.

## [1.11.1] - 2026-11-09

### Changed

- Tool call frames are dark violet in the default theme.

## [1.11.0] - 2026-11-09

### Added

- Tool calls in a frame.

## [1.10.0] - 2026-11-09

### Added

- Claude's replies in a frame.

## [1.9.0] - 2026-11-09

### Added

- The status line in a frame, Clawd inside it.

## [1.8.1] - 2026-11-08

### Fixed

- The prompt frame holds plain text, without the highlight of Claude Code's own row.

## [1.8.0] - 2026-11-08

### Added

- Your prompts in a frame.

## [1.7.0] - 2026-11-08

### Changed

- The RAM/CPU line's command toggles it when given no value.

## [1.6.1] - 2026-11-08

### Changed

- The matrix rain is Clawd orange in the default theme.

## [1.6.0] - 2026-11-08

### Added

- Clawd's matrix animation.

## [1.5.0] - 2026-11-08

### Added

- A command to show or hide the RAM/CPU line.

## [1.4.2] - 2026-11-08

### Fixed

- A broken table row in the README.

## [1.4.1] - 2026-11-08

### Changed

- The RAM/CPU line is dimmer in the default theme.

## [1.4.0] - 2026-11-08

### Added

- Added and removed line counts on the git line.

## [1.3.2] - 2026-11-08

### Changed

- The README's settings example is easier to read.

## [1.3.1] - 2026-11-08

### Changed

- New default theme colors for effort, output style and the RAM/CPU line.

## [1.2.1] - 2026-11-08

### Fixed

- RAM/CPU numbers without padding.

## [1.2.0] - 2026-11-08

### Changed

- The RAM/CPU line in white with dimmer numbers.

## [1.1.0] - 2026-11-08

### Added

- A RAM/CPU line under the usage bars.

## [1.0.0] - 2026-11-08

### Added

- The status line and the agents counters as one mod: model, session, modes, agents, usage bars, git state, Clawd and color themes.
