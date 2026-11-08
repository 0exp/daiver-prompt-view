// history: the prompts the person sent this session, in a pane at the right
// (the `history` option, /daiver-prompt-view:history:show). The pane's body is
// framed in the theme's `history` color (Clawd orange by default), a × in its
// corner closes it; the prompts live in $.state, so they outlive a reload
import { atom, read, update } from 'claude-code'
import type { EngineInterface, On, PromptSubmitInput } from 'claude-code'
import { command, failed } from '../shared/commands'
import { config, writeConfig } from '../shared/config'
import { setOption } from '../shared/options'
import { hexOf, THEMES } from '../shared/themes'
import type { Prompt } from '../../types'

export const HISTORY = command('history', 'show')
export const PANE = 'history'
const KEEP = 200

// a new tag declines what an earlier shape of Prompt stored
const prompts = atom({ plugin: 'daiver-prompt-view', key: 'prompts' } as const, [], { shape: 'prompts-1' })

function open($: EngineInterface) {
  return $.ui.open({ id: PANE, title: 'Prompts' })
}

// turns the option, writes it to the config file, opens or closes the pane
async function show($: EngineInterface, value: boolean) {
  const deny = await setOption($, 'history', value)

  if (deny !== undefined) return `The prompt history pane was not changed: ${deny}`

  config.history = value
  await writeConfig($)
  if (value) await open($)
  else await $.ui.close({ id: PANE })

  return value ? 'The prompt history pane is now shown.' : 'The prompt history pane is now hidden.'
}

// opens the pane on the session start when the option is on
export async function startHistory($: EngineInterface) {
  if (config.history) await open($)
}

// every prompt the person types (not a slash command, not a notification) joins
// the list (called from the one prompt.submit hook, in register.ts)
export async function collectPrompt($: EngineInterface, e: PromptSubmitInput) {
  if (e.origin.kind !== 'composer' && e.origin.kind !== 'bridge') return
  if (e.command !== undefined || e.isMeta === true || e.text.trim() === '') return
  const prompt: Prompt = { text: e.text, at: await $.clock.now() }
  await update($, prompts, list => [...list, prompt].slice(-KEEP))
}

export function registerHistory(on: On) {
  // show [on|off]: the history option, toggled when no argument
  on('command.run', { command: HISTORY }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg !== '' && arg !== 'on' && arg !== 'off') return { text: `Usage: /${HISTORY} [on|off]` }

    return { text: await show($, arg === '' ? !config.history : arg === 'on') }
  }).catch(($, e, next) => failed(next.error.message ?? next.error.kind))

  // the person's close (the × or ctrl+x x) turns the option off too
  on('ui.close', { id: PANE }, async ($, e, next) => {
    if (e.origin.kind === 'person' && config.history) {
      const deny = await setOption($, 'history', false)

      if (deny === undefined) {
        config.history = false
        await writeConfig($)
      }
    }

    return next(e)
  }).catch(($, e, next) => next(e))

  // the pane: a frame in the theme's history color, the × in its top right
  // corner, the newest prompts that fit, one line each
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const list = await read($, prompts)
    const columns = Math.max(8, e.props.bodyColumns - 4)
    const room = Math.max(1, (e.viewport?.rows ?? 24) - 5)
    const shown = list.slice(-room)
    const first = list.length - shown.length
    const line = (text: string) => {
      const one = text.split('\n')[0]!.trim()
      return one.length > columns ? `${one.slice(0, columns - 1)}…` : one
    }

    return (
      <Box flexDirection="column" borderStyle="round" borderColor={hexOf(THEMES[config.theme]!.history)} paddingX={1}>
        <Box justifyContent="space-between">
          <Text bold>Prompts ({list.length})</Text>
          <Button key="close" label="×" role="dismiss" hotkey="x" plain onPress={() => void $.ui.close({ id: PANE })} />
        </Box>
        {shown.length === 0 && <Text dimColor>No prompts yet.</Text>}
        {shown.map((prompt, i) => (
          <Text>
            <Text dimColor>{String(first + i + 1).padStart(3)} </Text>
            {line(prompt.text)}
          </Text>
        ))}
      </Box>
    )
  })
}
