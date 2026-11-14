# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
