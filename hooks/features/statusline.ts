// statusline: the status line script and what it reads besides its input. The
// plugin's folder moves with each GitHub update: the status line runs a copy at
// a stable path (<mod dir>/statusline.sh), refreshed on every session start
import type { EngineInterface, On } from 'claude-code'
import { command, failed } from '../shared/commands'
import { config, writeConfig } from '../shared/config'
import { setOption } from '../shared/options'
import { home, sync } from '../shared/files'

const SCRIPT = 'statusline/daiver-prompt-view.sh'

export const USAGE = command('statusline', 'show-usage')
// how statusLine.command names the script: the installed copy's path
const SCRIPT_COPY = 'daiver-prompt-view/statusline.sh'
// the status line's input has no auto memory state: <mod dir>/automemory holds
// it, a file per session (`on` or `off`), for the script's <automemory:…> segment
const AUTO_MEMORY_KEY = 'autoMemoryEnabled'

// /pause-memory, as the prompt footer's mode label says it
let memoryPaused = false
// the engine left the memory section out though no setting turned it off: a kind
// of session without auto memory (remote, restricted, ...)
let memoryBlocked = false

// as the engine decides, for what a plugin can see: the switch variable beats the setting
async function autoMemoryOn($: EngineInterface) {
  const env = (await $.env.get('CLAUDE_CODE_DISABLE_AUTO_MEMORY'))?.toLowerCase() ?? ''

  if (memoryPaused || ['1', 'true', 'yes', 'on'].includes(env)) return false
  if (['0', 'false', 'no', 'off'].includes(env)) return true

  return !memoryBlocked && (await $.settings.read({ key: AUTO_MEMORY_KEY })) !== false
}

async function writeAutoMemory($: EngineInterface) {
  const path = `${await home($)}/automemory/${await $.session.id()}`

  await sync($, path, (await autoMemoryOn($)) ? 'on\n' : 'off\n')
}

// on every session start (and so every reload): the script copy, its config and theme, auto memory
export async function startStatusline($: EngineInterface) {
  await sync($, `${await home($)}/statusline.sh`, await $.fs.read(`${$.plugin.root}/${SCRIPT}`))
  await readPadding($)
  await writeConfig($)
  await writeAutoMemory($)
  // a second's refresh, as the status line's: /memory changes the setting any time
  $.clock.every(1000, () => writeAutoMemory($))
  // the padding drawn, again every few seconds: a settings file or a plugin above may change it
  $.clock.every(5000, async () => {
    await readPadding($)
    await writeConfig($)
  })
}

// the settings as the engine merges them, with statusLine.padding set to the
// statuslinePadding option while statusLine runs this mod's script (nothing
// is written to settings.json: every reader of the merged settings, the status
// line's own Box included, reads the padding from here). A read of one source
// is left as that file holds it
// the padding Claude Code draws the status line with, from statusLine as the
// merged settings hold it: its padding (none: 0, as the engine's Box takes it)
// while it runs this mod's script; undefined for another status line or none
export function drawnPadding(line: unknown) {
  const own = line as { command?: unknown; padding?: unknown } | undefined

  if (typeof own !== 'object' || own === null || typeof own.command !== 'string' || !own.command.includes(SCRIPT_COPY)) return undefined

  return Number.isInteger(own.padding) ? (own.padding as number) : 0
}

// this mod's settings.read hook ran since the last readPadding; the skip noted once a load
let hookRan = false
let skipNoted = false

// the frame is built for the padding the engine draws with, not the option's
// alone: a plugin seated above (an organization's) may send settings.read on
// past this mod's hook, and the settings.json padding is then the one drawn. A
// read the hooks refuse leaves the option's
async function readPadding($: EngineInterface) {
  hookRan = false
  const drawn = drawnPadding(await $.settings.read({ key: 'statusLine' }).catch(() => undefined))

  config.drawnPadding = drawn
  if (drawn !== undefined && drawn !== config.padding && !hookRan && !skipNoted) {
    skipNoted = true
    $.ui.log(
      `daiver-prompt-view: statuslinePadding ${config.padding} is not applied: a plugin above passes settings.read on past this mod; the status line keeps statusLine.padding ${drawn} from the settings files, and its frame follows it`,
      { to: 'debug' },
    )
  }
}

export function withPadding(settings: Readonly<Record<string, unknown>>) {
  const line = settings.statusLine as { command?: unknown } | undefined

  if (typeof line !== 'object' || line === null || typeof line.command !== 'string' || !line.command.includes(SCRIPT_COPY)) return settings

  return { ...settings, statusLine: { ...line, padding: config.padding } }
}

export function registerStatusline(on: On) {
  // statusline:show-usage [on|off]: the statuslineUsage option, the session's
  // tokens and cost on the first line; toggled when no argument
  on('command.run', { command: USAGE }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg !== '' && arg !== 'on' && arg !== 'off') return { text: `Usage: /${USAGE} [on|off]` }

    const value = arg === '' ? !config.usage : arg === 'on'
    const deny = await setOption($, 'statuslineUsage', value)

    if (deny !== undefined) return { text: `The session's tokens and cost were not changed: ${deny}` }

    config.usage = value
    await writeConfig($)

    return { text: `The session's tokens and cost are now ${value ? 'shown' : 'hidden'}.` }
  }).catch(($, e, next) => failed(next.error.message ?? next.error.kind))

  on('settings.read', async ($, e, next) => {
    hookRan = true
    const result = await next(e)

    return e.source === undefined && result.deny === undefined ? { value: withPadding(result.value) } : result
  }).catch(($, e, next) => next(e))

  // the prompt's memory section is the engine's own answer for this session
  on('prompt.section', { name: 'memory' }, async ($, e, next) => {
    const result = await next(e)

    memoryBlocked = result.text === null && !memoryPaused && (await $.settings.read({ key: AUTO_MEMORY_KEY })) !== false
    await writeAutoMemory($)

    return result
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'SessionMode' }, async ($, e, next) => {
    memoryPaused = e.props.modes.includes('memory paused')

    return next(e)
  }).catch(($, e, next) => next(e))
}
