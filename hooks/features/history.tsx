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

// the transcript row of a prompt, by its text, as the UserMessage render hook
// (prompt.tsx) sees it while the row is on screen: the last resort of a jump
const rows = new Map<string, string>()
export const noteRow = (text: string, requestId: string) => void rows.set(text, requestId)

// the prompt rows the transcript has on screen, by id, as the UserMessage
// render hook reports them (`onScreen`: an object while in view, null once
// out; absent says nothing). A render hook cannot write state, so a tick
// copies the set to `visible` when it changed, and the pane alone redraws
const onScreen = new Map<string, boolean>()
export function noteOnScreen(requestId: string, on: object | null | undefined) {
  if (on === undefined) return
  if (on === null) onScreen.delete(requestId)
  else onScreen.set(requestId, true)
}
const onScreenRows = atom({ plugin: 'daiver-prompt-view', key: 'visible' } as const, [])
let lastVisible = ''
async function syncVisible($: EngineInterface) {
  const now = [...onScreen.keys()].sort()
  const key = now.join('\n')

  if (key === lastVisible) return
  lastVisible = key
  await update($, onScreenRows, () => now)
}

// the text of a stored user row: its text blocks joined
const textOf = (content: readonly { type: string; text?: string }[]) =>
  content
    .filter(block => block.type === 'text' && typeof block.text === 'string')
    .map(block => block.text)
    .join('\n')

// the session's transcript file (~/.claude/projects/<cwd, every other
// character a dash>/<session id>.jsonl): a JSON row per message, user rows
// with the prompt as `message.content` and the row's `uuid`
async function transcriptRows($: EngineInterface) {
  const slug = (await $.session.cwd()).replace(/[^A-Za-z0-9]/g, '-')
  const path = `${await $.env.get('HOME')}/.claude/projects/${slug}/${await $.session.id()}.jsonl`

  if (!(await $.fs.exists(path))) return new Map<string, string>()
  const found = new Map<string, string>()

  for (const line of (await $.fs.read(path)).split('\n')) {
    if (line === '') continue
    try {
      const row = JSON.parse(line) as { type?: unknown; uuid?: unknown; isMeta?: unknown; message?: { content?: unknown } }
      if (row.type === 'user' && row.isMeta !== true && typeof row.uuid === 'string' && typeof row.message?.content === 'string') {
        found.set(row.message.content, row.uuid)
      }
    } catch {
      // a line that is not JSON (a write in progress) is skipped
    }
  }

  return found
}

// a new tag declines what an earlier shape of Prompt stored
const prompts = atom({ plugin: 'daiver-prompt-view', key: 'prompts' } as const, [], { shape: 'prompts-2' })
// the pane scrolls by messages, itself: how many of the newest it scrolled past
const skip = atom({ plugin: 'daiver-prompt-view', key: 'skip' } as const, 0)

// the pane, its body on the theme's pane background (darker than the terminal's)
function open($: EngineInterface) {
  return $.ui.open({ id: PANE, title: 'Prompts', backgroundColor: hexOf(THEMES[config.theme]!.paneBackground) })
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
  $.clock.every(1000, () => syncVisible($))
}

// a press on a message scrolls the transcript to the prompt's row; a row that
// cannot be reached is noted in the debug log alone (no toasts: the mod stays quiet)
async function jump($: EngineInterface, text: string, uuid: string | undefined) {
  const requestId = uuid ?? rows.get(text) ?? (await transcriptRows($)).get(text)

  if (requestId === undefined) {
    $.ui.log('history: the prompt has no transcript row to scroll to', { to: 'debug' })
    return
  }
  const moved = await $.ui.scroll({ to: { requestId }, block: 'start' })

  if (moved.deny !== undefined) $.ui.log(`history: could not scroll to the prompt: ${moved.deny}`, { to: 'debug' })
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

  // a prompt's row, as the session stores it: its uuid joins the prompt (the
  // newest with that text and no uuid yet), what a press scrolls to
  on('session.append', { door: 'prompt' }, async ($, e, next) => {
    if (e.message.type === 'user' && e.message.isMeta !== true && (e.origin.kind === 'composer' || e.origin.kind === 'bridge')) {
      const text = textOf(e.message.content)
      await update($, prompts, list => {
        const i = list.findLastIndex(one => one.text === text && one.uuid === undefined)
        return i === -1 ? list : list.map((one, k) => (k === i ? { ...one, uuid: e.uuid } : one))
      })
    }

    return next(e)
  }).catch(($, e, next) => next(e))

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

  // the person's wheel or keys on the pane: the window stays where it is (no
  // `next`), the list under the header moves by messages instead, so the
  // header with the × stays put; a rough 4 rows a message
  on('ui.scroll', { requestId: PANE }, async ($, e) => {
    const count = (await read($, prompts)).length
    const step = e.by === 0 ? 0 : Math.sign(e.by) * Math.max(1, Math.round(Math.abs(e.by) / 4))
    await update($, skip, n => Math.min(Math.max(0, (n ?? 0) + step), Math.max(0, count - 1)))

    return {}
  }).catch(() => ({}))

  // the pane: the × in its top right corner, every prompt as a message of its
  // own (a frame in the theme's prompt color, its time on top, its whole text
  // under), newest first, less the ones scrolled past. Under the pointer a
  // message's frame turns the theme's hover color and its text stays as it
  // is; the frame in the theme's history color is drawn around the body only
  // while it holds no message
  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Button, Text } = $.ui.resolve(e)
    const list = await read($, prompts)
    const past = Math.min(await read($, skip), Math.max(0, list.length - 1))
    const shown = [...list].reverse().slice(past)
    const theme = THEMES[config.theme]!
    const shownNow = new Set(await read($, onScreenRows))
    const isOnScreen = (prompt: Prompt) => shownNow.has(prompt.uuid ?? rows.get(prompt.text) ?? '')
    const frame = list.length === 0 ? { borderStyle: 'round', borderColor: hexOf(theme.history) } : {}
    // the scrollbar at the list's right edge: a track as tall as the body under
    // the header, its thumb where the list stands (messages a rough 4 rows each)
    const track = Math.max(3, e.props.scroll.bodyRows - 2)
    const visible = Math.max(1, Math.floor(track / 4))
    const thumb = Math.max(1, Math.round((track * Math.min(visible, list.length)) / Math.max(1, list.length)))
    const thumbAt = list.length > 1 ? Math.round(((track - thumb) * past) / (list.length - 1)) : 0
    const bar = Array.from({ length: track }, (_, row) => row >= thumbAt && row < thumbAt + thumb)
    // a message whose prompt is on screen in the transcript: a bold frame in the
    // theme's onscreen color, so the pane maps where the chat stands
    const message = (prompt: Prompt, i: number) => (
      <Box
        key={`m${i}`}
        flexDirection="column"
        borderStyle={isOnScreen(prompt) ? 'bold' : 'round'}
        borderColor={hexOf(isOnScreen(prompt) ? theme.onscreen : theme.prompt)}
        paddingX={1}
        hover={{ borderColor: hexOf(theme.hover) }}
      >
        <Text dimColor>{clock(prompt.at)}</Text>
        <Button key={`p${i}`} plain hover={{ inverse: false }} onPress={() => jump($, prompt.text, prompt.uuid)}>
          {prompt.text.trim()}
        </Button>
      </Box>
    )

    return (
      <Box flexDirection="column" paddingX={1} {...frame}>
        <Box justifyContent="space-between">
          <Text bold>
            Prompts ({list.length}){past > 0 && <Text dimColor> ↑{past}</Text>}
          </Text>
          <Button key="close" label="×" role="dismiss" hotkey="x" plain onPress={() => void $.ui.close({ id: PANE })} />
        </Box>
        {list.length === 0 && <Text dimColor>No prompts yet.</Text>}
        {list.length > 0 && (
          <Box flexDirection="row">
            <Box flexDirection="column" flexGrow={1}>
              {shown.map(message)}
            </Box>
            {list.length > 1 && (
              <Box flexDirection="column" width={1} marginLeft={1}>
                {bar.map(isThumb => (isThumb ? <Text color={hexOf(theme.history)}>┃</Text> : <Text dimColor>│</Text>))}
              </Box>
            )}
          </Box>
        )}
      </Box>
    )
  })
}
