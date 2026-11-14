# daiver-prompt-view: development rules

The mod's layout, invariants and checks are in `skills/daiver-prompt-view/SKILL.md`; read it before changing anything. These rules hold for every change:

## A new or changed option (`userConfig` in `.claude-plugin/plugin.json`)

- Update `README.md` in the same change: a row in the **Options** table (key, `/config` label, type, default, values, command if any) and the option in the `pluginConfigs` JSON example.
- The `pluginConfigs` example stays one option per line, with the values aligned in a column (pad after the key's colon so every value starts at the same column). Re-align the whole block when a longer key is added; never collapse it back to one line.
- Give a usage example for it in `README.md`: what a value does, shown in a table or a snippet.
- A renamed or removed option is renamed or removed in the README too.

## A new or changed command (`commands/<feature>/<name>.md`)

- Document it in `README.md` in the same change: a row in the **Commands** summary table (arguments, default, what it does) and a `### /daiver-prompt-view:<feature>:<name> [args]` section with:
  - the option it sets and its default;
  - every value it takes, with a description (a table when there are several);
  - a usage table: each form (with a value, with no argument, with a wrong value) and its exact answer, as the code returns it.

## Command arguments always have typeahead

- Every command that takes values lists them in the prompt box's typeahead: add the command to the `choiceRows` table in `hooks/register.ts` (`values` and `current`), and put the values in the `.md` file's `argument-hint`.
- Values come from the same constant the command validates against (`ANIMATIONS`, `THEME_NAMES`, ...), never a copy.
- Cover it in `tests/autocomplete.test.ts`.

## Every change goes into `CHANGELOG.md`

- `CHANGELOG.md` follows [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/): the newest version on top, `## [x.y.z] - YYYY-MM-DD` headings, entries grouped under `### Added`, `### Changed`, `### Deprecated`, `### Removed`, `### Fixed`, `### Security`, and an `## [Unreleased]` section kept at the top.
- Every change is a new version, a minor one too (a color, a text, a doc fix): it bumps `version` in `.claude-plugin/plugin.json` (patch for fixes and small tweaks, minor for features) and adds its entry in the same change, under that version's heading, dated the day of the change. Nothing is left without an entry; `[Unreleased]` stays empty between releases.
- An entry is a short summary of what changed for the person using the mod, by meaning: what it does now, not how. No file names, functions, hooks, props or other implementation details; one line per change, as many lines as there are distinct changes.
- A reverted change leaves no entry; a change undone within the same version is not listed.

## Before calling a change done

`claude plugin test .`, `claude plugin validate .`, and the type-check from the skill all pass; bump `version` in `.claude-plugin/plugin.json` and add the change to `CHANGELOG.md` under that version.

## Commits and pushes are offered, never made on their own

- Never commit or push without the maintainer's yes, whatever the output style. Keep track of every feature built in the session.
- A finished feature: offer to commit it and push it, and wait for the answer.
- A feature made of several: each one is implemented and committed on its own (its own version and `CHANGELOG.md` entry), offered as it is finished; the push is offered once, after all of them are committed.
