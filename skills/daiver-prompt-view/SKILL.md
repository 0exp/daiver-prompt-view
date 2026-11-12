---
name: daiver-prompt-view
description: Manage the daiver-prompt-view Claude Code mod (the multi-line status line under the prompt - model/session/stime, modes, the agents line of the main loop and background agents/shells/monitors, ctx/lmt/rst/pch bars, git state, Clawd the mascot, color themes). Use when the user asks to check, enable, disable, update, change, debug, release, publish or uninstall the daiver-prompt-view mod/plugin, its status line, agents counters, Clawd (clodik), its themes, commands or statusLine wiring.
---

# daiver-prompt-view mod

```
Opus 5.5 -> [demo] (sid:419e75ee) <stime:1h23m> <automemory:on>
(effort:high) (outputstyle:Proactive) (thinkmode:thinking) (fastmode:false)          ▐▛███▜▌
⚙ main:thinking (1m13s) │ agents:1 (sub:1 sh:0 mon:0) -> pending:0 running:1 …    ▝▜█████▛▘
-> Explore (time:1m01s) [Find lock index usages]                                     ▘▘ ▝▝
ctx ███░░░░░░░ 37% | lmt ████░░░░░░ 43% | rst ██████░░░░ 1h56m (at 17h48m) | pch …  2.1.303
 (08d3788a) main [+#?] +12/-3 | ~/Projects/demo
```

## Where things are

| What | Path |
| --- | --- |
| Source repo (also the marketplace) | `~/Projects/daiver-prompt-view/` (dev checkout of `github.com/0exp/daiver-prompt-view`; the status script reads `$DAIVER_PROMPT_VIEW_REPO` when it lives elsewhere) |
| Hooks module | `hooks/register.ts`: reads the options, the one `session.start` and the one `prompt.submit` (a module may hook each once without a matcher: they call `start*`, `forgetNotifiedTasks`, `collectPrompt`), the typeahead; calls each feature's `register*`/`start*` |
| Features | `hooks/features/statusline.ts` (script copy, config, auto memory), `agents.ts` (the agents line, former agent-count), `clodik.ts` (Clawd's commands), `prompt.tsx` (the frame around the person's prompts, a `ui.render` hook on `UserMessage`), `reply.tsx` (the frame around Claude's replies, on `AssistantMessage`), `tool.tsx` (the frame around tool calls, on `ToolUse`), `spinner.tsx` (the frame around the spinner line, on `Spinner`), `command.tsx` (the frame around a slash command's output, on `CommandOutput`), `chat.ts` (`chat:show-borders`, `chat:show-chat-borders`, `chat:show-statusline-borders`: the `borders` option every frame and the script's `frame()` honour, `chatBorders` the five transcript frames alone, `statuslineBorders` the script's `frame()` alone, each drawn while it and `borders` are on; `chat:border-style`: the `borderStyle` option, `dashed` (default; Box `dashed`, the script's `╌`/`╎` with open corners) or `line` (Box `round`, `─`/`│`), from `BORDER_STYLES` and `frameStyle()` in `shared/config.ts`, for every frame, the history pane's included), `history.tsx` (the history pane: `history:show` and `history:mode` commands (`historyMode`: `fullstory` | `questions` | `answers` from `HISTORY_MODES`; in `fullstory` prompts get `marginLeft` and answers `marginRight`, `SHIFT` columns), `prompt.submit` collector, the `Pane`; the person's slash commands (`Ran`: name, args, output) in `$.state` `commands`, seeded on start from the transcript file (the echo is a user row for a built-in command, a `local_command` system row for a plugin's, both with `<command-name>`/`<command-args>`; the output the next `local_command` row's `<local-command-stdout>`), live from the one matcherless `command.run` in `register.ts` (`collectCommand`, beside `commandToast`), on the prompts' side in `command` color; a press scrolls to the CommandOutput row noted by `command.tsx` (`noteCommandRow`), else the echo's uuid; Claude's answers (each text block and each `tool_use`, as `Bash(ls)` by `toolLine`) in `$.state` `answers`, seeded on start from the transcript file's assistant rows (not `isSidechain`), live from `session.append` door `response` on main (no `agentId`); a press on an answer scrolls to its `toolUseId` (the ToolUse row), else its row `uuid`; its prompts in `$.state`, seeded on start from `~/.claude/history.jsonl` by session id, contract in `types/index.d.ts`; the pane scrolls itself: a `ui.scroll` hook on its id keeps the window (no `next`) and moves `skip` (messages scrolled past, in `$.state`) by `e.by / 4`, so the header stays, and a scrollbar column (`│`/`┃`, `bodyRows - 2` tall) shows where the list stands; a press scrolls the transcript to the row via `$.ui.scroll({ to: { requestId } })`; the row's uuid comes from `session.append` (door `prompt`) into the Prompt, else from the transcript file `~/.claude/projects/<cwd slug>/<session>.jsonl`, else from `prompt.tsx`'s `UserMessage` hook through `noteRow`), `view.ts` (theme command), `toasts.ts` (the `Task complete` and `/-Command complete` toasts, `toasts:show`) |
| Shared | `hooks/shared/config.ts` (options -> `config` file + `theme.sh`), `themes.ts` (ALL themes), `commands.ts` (command names, typeahead rows), `files.ts`, `options.ts` |
| Commands | `commands/<feature>/<name>.md` -> `/daiver-prompt-view:<feature>:<name>`, answered by a `command.run` hook (the .md body is only a fallback if the mod is not loaded) |
| Status line script (source of truth) | `statusline/daiver-prompt-view.sh` |
| Installed copy (what the status line runs) | `~/.claude/daiver-prompt-view/statusline.sh` |
| State, per session | `~/.claude/daiver-prompt-view/agents/<session_id>`, `.../automemory/<session_id>`; `.../agents.idle`, the agents line of a session with no state yet; options in `.../config`, colors in `.../theme.sh` |
| Wiring | `statusLine.command` in `~/.claude/settings.json` = `sh "$HOME/.claude/daiver-prompt-view/statusline.sh"`, `refreshInterval: 1` |
| Installed as | `daiver-prompt-view@daiver-prompt-view`, user scope; for development a `directory` marketplace pointing at the repo (read from the folder itself: never move it without reinstalling) |

## Invariants

- The agents lines are printed by the script from `agents/<session_id>`, right after the modes line; the hooks module writes it only when its text changed. The line is never missing: with no file for the session (or an empty one) the script prints `agents.idle` (an idle main loop, zeros everywhere; written by `startAgents` and `redrawAgents` in the theme's colors), and with not even that, the same line built in the script from `c_gray`/`c_white`.
- The whole output goes through `frame()` (the theme's `c_frame`): `inner` = `$COLUMNS - 2*pad - 2` when known (`pad` = 2 + the `statuslinePadding` option, read from `padding=` in `config`, else `statusLine.padding` from `~/.claude/settings.json`; never under 0: the engine draws the status line in a Box with `paddingX: padding ?? 0` inside its own 2-column indent, so the padding is added to the 2, and only a negative one narrows the indent). The option reaches the engine through `statusline.ts`'s `settings.read` hook (`withPadding`): the merged settings get `statusLine.padding` = the option while `statusLine.command` runs `daiver-prompt-view/statusline.sh`; nothing is written to settings.json, a one-source read is left alone, never narrower than the widest line; Clawd's canvas ends at the right border (`col = inner - 11`).
- The script is POSIX `sh` + `jq` + `git` and prints something even with `{"model":{"display_name":"X"},"cwd":"/tmp"}`. Private-use glyphs (U+E0A0) are `printf` octal escapes.
- Colors live only in `hooks/shared/themes.ts` as SGR params. The script sources `theme.sh` (`c_gray`, `c_white`, `c_orange`, `c_session`, `c_ctx`, `c_lmt`, `c_rst`, `c_pch`, `c_sha`, `c_branch`, `c_flags`, `c_added`, `c_removed`, `c_matrix`, `c_frame`, `c_effort`, `c_ostyle`); the agents line and the prompt, reply, tool, spinner, command and history-pane frames (`prompt`, `reply`, `tool`, `spinner`, `command`, `history`, `hover`, `paneBackground`, as #rrggbb via `hexOf`) use the same theme in TS. A new theme = an entry in `THEMES` + its name in `userConfig.theme.options` (`plugin.json`) + `argument-hint` of `commands/view/theme.md`. `tests/statusline.test.ts` and `tests/agents.test.ts` pin `default` byte for byte.
- A new command = `commands/<feature>/<name>.md` (`description`, `argument-hint`, `disable-model-invocation: true`) + a `command.run` hook on `command('<feature>', '<name>')` whose `.catch` answers `failed(...)` (never `next`: that would send the .md body to the model) + its values in `register.ts`'s typeahead table.
- Agents: `AgentInfo` has no start time (`agentSince` stamped on first sight, cleared on every start); main time from `turn.start` while idle; shells/monitors from `tool.call` results, dropped on task notifications, `TaskStop`, `classic.Stop` snapshot.
- `$` reaches a helper only as a `function` declaration's parameter (never an arrow function's) when the helper is called across files.
- `setOption` finds the option's `/config` row by `$.plugin.name` and key suffix; with no row (another plugin filters `config.list`) it logs to debug and the change holds for the session only. The mod raises two toasts alone (`toasts.ts`, Claude Code's own `$.ui.toast`, off by default: on with the `toasts` option or `toasts:show`): `Task complete` on the main loop's `turn.complete` with `reason: 'answer'` (a matcher: agents.ts holds the matcherless one), `/-Command complete` after a command the person ran (`commandToast`, called from the one matcherless `command.run` in `register.ts`, registered first so it wraps this mod's own commands, which answer without `next`; the same hook calls `collectCommand` for the history pane). Anything else to say outside a command's answer goes to `$.ui.log(text, { to: 'debug' })`. A plugin seated above (`cc-plugin-sec-default`) has been seen to swallow this mod's `prompt.section` and `classic.Stop`; a command that answers `shown` twice means the option did not persist.
- Every gating hook has a `.catch`: a mod failure must never block a tool call or a prompt. `$` is passed only to top-level functions.

## Development rules (`.claude/CLAUDE.md` in the repo)

- A new or changed option: update `README.md` (the **Options** table, the `pluginConfigs` example) with a usage example, in the same change.
- A new or changed command: a row in README's **Commands** table and its own section (option and default, every value described, a usage table with each form and its exact answer).
- Every command's values have typeahead: a `choiceRows` entry in `hooks/register.ts` + `argument-hint` in its `.md`, from the constant the command validates against, covered in `tests/autocomplete.test.ts`.

## Tasks

**Status / health check**: `sh <this skill's base directory>/scripts/status.sh`; report install state and version, repo changes, installed copy vs repo, wiring, the sample render and the newest agents lines.

**Change it**
1. Edit the feature file (no semicolons, single quotes, 2 spaces) or the script (2-space indent, a comment per segment).
2. Script changes: render before and after with a full sample input (`session_id`, `session_name`, `model.display_name`, `workspace.current_dir`, `transcript_path`, `cost.total_duration_ms`, `effort.level`, `thinking.enabled`, `output_style.name`, `fast_mode`, `context_window.*`, `rate_limits.five_hour.*`, `version`) and show plain text (`sed $'s/\e\\[[0-9;]*m//g'`).
3. `claude plugin test ~/Projects/daiver-prompt-view` and `claude plugin validate ~/Projects/daiver-prompt-view` (expected warning: no icon).
4. Type-check: load `plugin-authoring` for this build's `claude-code.d.ts`; tsconfig in the scratchpad (`strict`, `target: es2023`, `module: esnext`, `moduleResolution: bundler`, `lib: [es2023]`, `noEmit`, `types: []`, `include` = the d.ts + the repo's `hooks/`), `npx -y -p typescript@5.6.3 tsc -p <scratchpad>`.
5. Bump `version` in `.claude-plugin/plugin.json` (patch fixes, minor features) and update `README.md`.
6. Apply: ask the user to type `/reload-plugins` (Claude cannot run slash commands); the installed script copy refreshes on that start.

**Wire the status line**: set `statusLine` to `{ "type": "command", "command": "sh \"$HOME/.claude/daiver-prompt-view/statusline.sh\"", "refreshInterval": 1 }` with python `json`/`jq`, backing up `settings.json` first (`settings.json.bak-daiver-prompt-view`).

**Enable / disable / uninstall**
```sh
claude plugin enable  daiver-prompt-view@daiver-prompt-view
claude plugin disable daiver-prompt-view@daiver-prompt-view
claude plugin uninstall daiver-prompt-view@daiver-prompt-view && claude plugin marketplace remove daiver-prompt-view
```
The installed copy stays, so the status line keeps working without the agents line and live options. Offer to restore `statusLine` from the backup and to delete `~/.claude/daiver-prompt-view/`; ask before deleting.

**Clean stale state**: `agents/` and `automemory/` hold a file per session, never removed: list `find ~/.claude/daiver-prompt-view/agents ~/.claude/daiver-prompt-view/automemory -type f -mtime +7` and ask before deleting.

**Release / publish**: `origin` = `https://github.com/0exp/daiver-prompt-view`, branch `main`. Commit and push only when the user asks; bump `version` first. Others install with `/plugin install daiver-prompt-view --marketplace 0exp/daiver-prompt-view`, update with `claude plugin marketplace update daiver-prompt-view`. Never commit `.claude-plugin/types/` or a local `tsconfig.json`.

## Debugging

- Status line empty or stale: installed copy missing/old, `jq` missing, or `statusLine.command` not wired: `echo '{"model":{"display_name":"X"},"cwd":"/tmp"}' | sh ~/.claude/daiver-prompt-view/statusline.sh`.
- No colors: `theme.sh` not written yet (the mod has not started in a session).
- Agents line missing or frozen: the mod is not loaded (`claude plugin list`) or the session predates the install; check the file's mtime.
- A command answered by the model: the mod is not loaded, so the .md fallback ran.
- Hook errors: dim transcript lines in hot-reloading sessions; otherwise `claude --debug` and grep `daiver-prompt-view:`.
- `stime` wrong off macOS: `stat -f %B` is BSD; the fallback is `cost.total_duration_ms`.
