import type { PromptAutocompleteInput } from 'claude-code'

// the plugin's commands are its commands/<feature>/<name>.md files, which Claude
// Code names /daiver-prompt-view:<feature>:<name>; a command.run hook answers each
// itself, so the file's body (a fallback) never reaches the model
export const PREFIX = 'daiver-prompt-view'
export const command = (feature: string, name: string) => `${PREFIX}:${feature}:${name}`

export type Choices = { values: readonly string[]; current: string }

// typeahead rows for the commands' arguments: `/<command> <value>` rows while a
// command's name is being typed (the event never fires for an empty token, so
// not right after the space), then the values that start with the typed argument
export function choiceRows(e: PromptAutocompleteInput, commands: Record<string, Choices>) {
  const before = e.text.slice(0, e.cursor)
  const rows: { text: string; description: string }[] = []
  const describe = (value: string, current: string) => (value === current ? 'current' : '')

  for (const [name, { values, current }] of Object.entries(commands)) {
    const slash = `/${name}`

    // from the feature's part on (`/daiver-prompt-view:clodik:`), not with every command
    if (e.start === 0 && e.token.length > slash.lastIndexOf(':') && slash.startsWith(e.token)) {
      for (const value of values) rows.push({ text: `${slash} ${value}`, description: describe(value, current) })
      continue
    }

    const at = before.startsWith(`${slash} `) || before.startsWith(`${slash}\t`) ? before.slice(slash.length).trim() : undefined

    if (at === undefined || at === '' || /\s/.test(at)) continue
    for (const value of values) {
      if (value.startsWith(at.toLowerCase()) && value !== at) rows.push({ text: value, description: describe(value, current) })
    }
  }

  return rows
}

// a failed command's answer: still an answer, so its .md body never reaches the model
export const failed = (reason: string) => ({ text: `daiver-prompt-view: the command failed: ${reason}` })
