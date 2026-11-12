// toasts: Claude Code's own toast when the person's work is done, so a look
// at the terminal is enough: `Task complete` when Claude's turn on the main
// loop ends with its answer (done, or waiting for the person's reply),
// `/-Command complete` when a slash command the person ran has finished. An
// interrupted turn, an error and a subagent's turn raise none. The `toasts`
// option (/daiver-prompt-view:toasts:show) turns them off
import type { CommandRunInput, EngineInterface, On } from 'claude-code'
import { command, failed } from '../shared/commands'
import { config, writeConfig } from '../shared/config'
import { setOption } from '../shared/options'

export const TOASTS = command('toasts', 'show')
export const TASK_DONE = 'Task complete'
export const COMMAND_DONE = '/-Command complete'

function raise($: EngineInterface, text: string) {
  if (config.toasts) $.ui.toast(text)
}

// a command the person typed (or sent over the bridge) has run (called from the
// one matcherless command.run hook, in register.ts): a command that starts a
// model turn ends with Task complete too
export function commandToast($: EngineInterface, e: CommandRunInput) {
  if (e.origin.kind === 'composer' || e.origin.kind === 'bridge') raise($, COMMAND_DONE)
}

export function registerToasts(on: On) {
  // toasts:show [on|off]: the toasts option, toggled when no argument
  on('command.run', { command: TOASTS }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg !== '' && arg !== 'on' && arg !== 'off') return { text: `Usage: /${TOASTS} [on|off]` }

    const value = arg === '' ? !config.toasts : arg === 'on'
    const deny = await setOption($, 'toasts', value)

    if (deny !== undefined) return { text: `The toasts were not changed: ${deny}` }

    config.toasts = value
    await writeConfig($)

    return { text: value ? 'The toasts are now shown.' : 'The toasts are now hidden.' }
  }).catch(($, e, next) => failed(next.error.message ?? next.error.kind))

  // turn.complete is hooked without a matcher in agents.ts: this one narrows on the answer
  on('turn.complete', { reason: 'answer' }, async ($, e, next) => {
    const result = await next(e)

    if (e.agentId === undefined) raise($, TASK_DONE)

    return result
  }).catch(($, e, next) => next(e))
}
