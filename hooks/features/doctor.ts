// doctor: what of the mod works in this session, for a session where a plugin
// seated above (an organization's security plugin) passes some of its hooks by:
// the settings read checked now, the other watched hooks by how often they ran
// since the mod loaded, the padding drawn against the option, where auto
// memory was told from
import type { EngineInterface, On } from 'claude-code'
import { command, failed } from '../shared/commands'
import { config } from '../shared/config'
import { seen } from '../shared/seen'
import { autoMemory, settingsHook, type MemorySource } from './statusline'

export const DOCTOR = command('mod', 'doctor')

const SETTINGS = {
  answered: 'answered by the mod (checked now): the padding option applies',
  passed: 'passed on past the mod by a plugin above (checked now): the padding option cannot apply, the frame follows settings.json',
  refused: 'refused (checked now): auto memory is read from the settings files',
} as const

const LATER = {
  'prompt.section': ['runs with each turn', 'tells a session whose auto memory is blocked'],
  'classic.Stop': ['runs as a turn ends', 'drops finished shells and monitors from the agents line'],
} as const

const MEMORY: Record<MemorySource, string> = {
  paused: 'paused (/pause-memory)',
  env: 'from CLAUDE_CODE_DISABLE_AUTO_MEMORY',
  blocked: 'this session has no memory section',
  settings: 'from the merged settings',
  files: 'from the settings files (the settings read was refused)',
  none: 'nothing could be read',
}

export async function doctorReport($: EngineInterface) {
  const hook = await settingsHook($)
  const memory = await autoMemory($)
  const ran = (name: keyof typeof LATER) => {
    const [when, what] = LATER[name]
    const count = seen[name]

    return `${name}: ${count > 0 ? `ran ${count} time${count === 1 ? '' : 's'}` : `not seen yet (it ${when}; still none after one: a plugin above passes it by)`}; it ${what}`
  }
  const drawn = config.drawnPadding
  const padding =
    drawn === undefined ? `statuslinePadding ${config.padding}; statusLine does not run the mod's script`
    : drawn === config.padding ? `statuslinePadding ${config.padding}, drawn ${drawn}`
    : `statuslinePadding ${config.padding}, drawn ${drawn} from settings.json: the option is not applied`

  return [
    'daiver-prompt-view doctor',
    `settings.read: ${SETTINGS[hook]}`,
    ran('prompt.section'),
    ran('classic.Stop'),
    `padding: ${padding}`,
    `auto memory: ${memory.state === 'unknown' ? '?' : memory.state}, ${MEMORY[memory.source]}`,
  ].join('\n')
}

export function registerDoctor(on: On) {
  // mod:doctor: no argument
  on('command.run', { command: DOCTOR }, async ($, e) => {
    if (e.args.trim() !== '') return { text: `Usage: /${DOCTOR}` }

    return { text: await doctorReport($) }
  }).catch(($, e, next) => failed(next.error.message ?? next.error.kind))
}
