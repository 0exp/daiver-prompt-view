// chat: how the transcript is dressed; for now the frames (the `borders`
// option): around the person's prompts, Claude's replies, tool calls, the
// spinner, command output, and the status line
import type { On } from 'claude-code'
import { command, failed } from '../shared/commands'
import { config, writeConfig } from '../shared/config'
import { setOption } from '../shared/options'

export const BORDERS = command('chat', 'show-borders')

export function registerChat(on: On) {
  // show-borders [on|off]: the borders option, toggled when no argument; every
  // framed site draws again at once
  on('command.run', { command: BORDERS }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg !== '' && arg !== 'on' && arg !== 'off') return { text: `Usage: /${BORDERS} [on|off]` }

    const value = arg === '' ? !config.borders : arg === 'on'
    const deny = await setOption($, 'borders', value)

    if (deny !== undefined) return { text: `The frames were not changed: ${deny}` }

    config.borders = value
    await writeConfig($)
    $.ui.invalidate('ui.render')

    return { text: value ? 'The frames are now shown.' : 'The frames are now hidden.' }
  }).catch(($, e, next) => failed(next.error.message ?? next.error.kind))
}
