// statusline: the status line script and what it reads besides its input. The
// plugin's folder moves with each GitHub update: the status line runs a copy at
// a stable path (<mod dir>/statusline.sh), refreshed on every session start
import type { EngineInterface, On } from 'claude-code'
import { writeConfig } from '../shared/config'
import { home, sync } from '../shared/files'

const SCRIPT = 'statusline/daiver-prompt-view.sh'
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
  await writeConfig($)
  await writeAutoMemory($)
  // a second's refresh, as the status line's: /memory changes the setting any time
  $.clock.every(1000, () => writeAutoMemory($))
}

export function registerStatusline(on: On) {
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
