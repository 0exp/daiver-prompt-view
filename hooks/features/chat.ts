// chat: how the transcript is dressed; for now the frames: the `borders`
// option over every frame (the person's prompts, Claude's replies, tool
// calls, the spinner, command output, the status line), and
// two options under it, each drawn while it and `borders` are both on:
// `chatBorders` over the transcript's frames, `statuslineBorders` over the
// status line's frame; and their style, the `borderStyle` option: `dashed`
// (the default) or `line` (a solid one)
import type { EngineInterface, On } from 'claude-code'
import { command, failed } from '../shared/commands'
import { BORDER_STYLES, config, writeConfig } from '../shared/config'
import { setOption } from '../shared/options'

export const BORDERS = command('chat', 'show-borders')
export const CHAT_BORDERS = command('chat', 'show-chat-borders')
export const STATUSLINE_BORDERS = command('chat', 'show-statusline-borders')
export const BORDER_STYLE = command('chat', 'border-style')

type Toggle = {
  name: string
  field: 'borders' | 'chatBorders' | 'statuslineBorders'
  what: string // the subject of the answers: 'The frames', "The status line's frame"
  plural: boolean
}

// [on|off] sets the option, no argument toggles it; the framed sites draw again
async function toggle($: EngineInterface, args: string, t: Toggle) {
  const arg = args.trim().toLowerCase()

  if (arg !== '' && arg !== 'on' && arg !== 'off') return { text: `Usage: /${t.name} [on|off]` }

  const value = arg === '' ? !config[t.field] : arg === 'on'
  const deny = await setOption($, t.field, value)
  const verb = t.plural ? 'are' : 'is'

  if (deny !== undefined) return { text: `${t.what} ${t.plural ? 'were' : 'was'} not changed: ${deny}` }

  config[t.field] = value
  await writeConfig($)
  $.ui.invalidate('ui.render')

  return { text: `${t.what} ${verb} now ${value ? 'shown' : 'hidden'}.` }
}

export function registerChat(on: On) {
  on('command.run', { command: BORDERS }, ($, e) => toggle($, e.args, { name: BORDERS, field: 'borders', what: 'The frames', plural: true }))
    .catch(($, e, next) => failed(next.error.message ?? next.error.kind))

  on('command.run', { command: CHAT_BORDERS }, ($, e) =>
    toggle($, e.args, { name: CHAT_BORDERS, field: 'chatBorders', what: "The chat's frames", plural: true }),
  ).catch(($, e, next) => failed(next.error.message ?? next.error.kind))

  on('command.run', { command: STATUSLINE_BORDERS }, ($, e) =>
    toggle($, e.args, { name: STATUSLINE_BORDERS, field: 'statuslineBorders', what: "The status line's frame", plural: false }),
  ).catch(($, e, next) => failed(next.error.message ?? next.error.kind))

  // border-style <dashed|line>: the borderStyle option; the current one when no argument
  on('command.run', { command: BORDER_STYLE }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === '') return { text: `Frame style: ${config.borderStyle} (one of ${BORDER_STYLES.join(', ')})` }
    if (!BORDER_STYLES.includes(arg)) return { text: `Usage: /${BORDER_STYLE} [${BORDER_STYLES.join('|')}]` }

    const deny = await setOption($, 'borderStyle', arg)

    if (deny !== undefined) return { text: `The frame style was not changed: ${deny}` }

    config.borderStyle = arg
    await writeConfig($)
    $.ui.invalidate('ui.render')

    return { text: `The frames are now ${arg}.` }
  }).catch(($, e, next) => failed(next.error.message ?? next.error.kind))
}
