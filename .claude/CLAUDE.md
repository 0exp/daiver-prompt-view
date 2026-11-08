# daiver-prompt-view: development rules

The mod's layout, invariants and checks are in `skills/daiver-prompt-view/SKILL.md`; read it before changing anything. These rules hold for every change:

## A new or changed option (`userConfig` in `.claude-plugin/plugin.json`)

- Update `README.md` in the same change: a row in the **Options** table (key, `/config` label, type, default, values, command if any) and the option in the `pluginConfigs` JSON example.
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

## Before calling a change done

`claude plugin test .`, `claude plugin validate .`, and the type-check from the skill all pass; bump `version` in `.claude-plugin/plugin.json`.
