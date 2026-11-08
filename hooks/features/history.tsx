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
const KEEP = 1000

// the transcript row of each prompt, by its text, as the UserMessage render
// hook (prompt.tsx) sees it: what a press on a message scrolls to. A module
// variable: every drawn row renders again on a load, so it fills itself
const rows = new Map<string, string>()
export const noteRow = (text: string, requestId: string) => void rows.set(text, requestId)

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

// the prompts of this session as Claude Code itself logged them, with their
// times: ~/.claude/history.jsonl, a JSON line per prompt typed at any session
// ({ display, timestamp, sessionId }); so the pane lists the prompts sent
// before the mod loaded too
async function logged($: EngineInterface) {
  const path = `${await $.env.get('HOME')}/.claude/history.jsonl`

  if (!(await $.fs.exists(path))) return []
  const session = await $.session.id()
  const list: Prompt[] = []

  for (const line of (await $.fs.read(path)).split('\n')) {
    if (line === '') continue
    try {
      const row = JSON.parse(line) as { display?: unknown; timestamp?: unknown; sessionId?: unknown }
      if (row.sessionId === session && typeof row.display === 'string' && typeof row.timestamp === 'number' && !row.display.startsWith('/')) {
        list.push({ text: row.display, at: row.timestamp })
      }
    } catch {
      // a line that is not JSON (a write in progress) is skipped
    }
  }

  return list
}

// on the session start: the list is seeded from Claude Code's own log (what
// the mod collected itself is kept where the log has no row for it), and the
// pane opens when the option is on
export async function startHistory($: EngineInterface) {
  const seed = await logged($)

  if (seed.length > 0) {
    await update($, prompts, mine => {
      const known = new Set(seed.map(one => `${one.at}:${one.text}`))
      return [...seed, ...mine.filter(one => !known.has(`${one.at}:${one.text}`))].sort((a, b) => a.at - b.at).slice(-KEEP)
    })
  }
  if (config.history) await open($)
}

// a press on a message scrolls the transcript to the prompt's row; a row the
// transcript no longer keeps drawn (or never drew) cannot be reached
async function jump($: EngineInterface, text: string) {
  const requestId = rows.get(text)

  if (requestId === undefined) {
    $.ui.toast('That prompt is not on screen any more.')
    return
  }
  const moved = await $.ui.scroll({ to: { requestId }, block: 'start' })

  if (moved.deny !== undefined) $.ui.toast(`Could not scroll to the prompt: ${moved.deny}`)
}

// a prompt's time as the pane shows it: HH:MM:SS, local time
const clock = (at: number) => {
  const d = new Date(at)
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':')
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

  // the pane: the × in its top right corner, every prompt as a message of its
  // own (a frame in the theme's prompt color, its time on top, its whole text
  // under; the body scrolls); the frame in the theme's history color is drawn
  // around the body only while it holds no message
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const list = await read($, prompts)
    const theme = THEMES[config.theme]!

    const frame = list.length === 0 ? { borderStyle: 'round', borderColor: hexOf(theme.history) } : {}

    return (
      <Box flexDirection="column" paddingX={1} {...frame}>
        <Box justifyContent="space-between">
          <Text bold>Prompts ({list.length})</Text>
          <Button key="close" label="×" role="dismiss" hotkey="x" plain onPress={() => void $.ui.close({ id: PANE })} />
        </Box>
        {list.length === 0 && <Text dimColor>No prompts yet.</Text>}
        {list.map((prompt, i) => (
          <Box flexDirection="column" borderStyle="round" borderColor={hexOf(theme.prompt)} paddingX={1}>
            <Text dimColor>{clock(prompt.at)}</Text>
            <Button key={`p${i}`} plain onPress={() => jump($, prompt.text)}>
              {prompt.text.trim()}
            </Button>
          </Box>
        ))}
      </Box>
    )
  })
}
