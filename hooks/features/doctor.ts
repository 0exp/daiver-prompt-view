// doctor: what of the mod works in this session, for a session where a plugin
// seated above (an organization's security plugin) passes some of its hooks by:
// the settings read checked now, the other watched hooks by how often they ran
// since the mod loaded, the padding drawn against the option, where auto
// memory was told from, and who skips the mod's hooks, as Claude Code's
// notices in the session's transcript name them
import type { EngineInterface, On } from 'claude-code'
import { command, failed } from '../shared/commands'
import { config } from '../shared/config'
import { transcriptPath } from '../shared/files'
import { seen } from '../shared/seen'
import { autoMemory, settingsHook, type MemorySource } from './statusline'

export const DOCTOR = command('mod', 'doctor')

const SETTINGS = {
  answered: () => 'answered by the mod (checked now): the padding option applies',
  passed: (by: string) => `passed on past the mod by ${by} (checked now): the padding option cannot apply, the frame follows settings.json`,
  refused: () => 'refused (checked now): auto memory is read from the settings files',
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

// Claude Code's notice, once a session, when a plugin seated above sends an
// event on past one of the mod's hooks: a system row of the transcript,
// `<mod>: its <event> hook was skipped. "<plugin>" runs first and sent the event
// on past it.`; the plugin by hook, in the order the notices came
export async function skippedBy($: EngineInterface) {
  const found = new Map<string, string>()
  const path = await transcriptPath($)

  if (!(await $.fs.exists(path))) return found

  const prefix = `${$.plugin.name}: its `
  for (const line of (await $.fs.read(path)).split('\n')) {
    if (!line.includes(prefix)) continue
    try {
      const row = JSON.parse(line) as { type?: unknown; content?: unknown }
      if (row.type !== 'system' || typeof row.content !== 'string' || !row.content.startsWith(prefix)) continue
      const notice = /^(\S+) hook was skipped\. "([^"]+)" runs first/.exec(row.content.slice(prefix.length))
      if (notice !== null && !found.has(notice[1]!)) found.set(notice[1]!, notice[2]!)
    } catch {
      // a row cut short while it is written
    }
  }

  return found
}

// the plugins that skip the mod's hooks, each with its hooks
function skippers(skipped: Map<string, string>) {
  const by = new Map<string, string[]>()
  for (const [hook, plugin] of skipped) by.set(plugin, [...(by.get(plugin) ?? []), hook])

  return [...by].map(([plugin, hooks]) => `"${plugin}" (${hooks.join(', ')})`)
}

export async function doctorReport($: EngineInterface) {
  const hook = await settingsHook($)
  const memory = await autoMemory($)
  const skipped = await skippedBy($)
  const ran = (name: keyof typeof LATER) => {
    const [when, what] = LATER[name]
    const count = seen[name]
    const by = skipped.get(name)
    const state =
      count > 0 ? `ran ${count} time${count === 1 ? '' : 's'}${by === undefined ? '' : `, skipped before by "${by}"`}`
      : by !== undefined ? `skipped: "${by}" runs first and sends it on past the mod`
      : `not seen yet (it ${when}; still none after one: a plugin above passes it by)`

    return `${name}: ${state}; it ${what}`
  }
  const above = skipped.get('settings.read')
  const who = skippers(skipped)
  const drawn = config.drawnPadding
  const padding =
    drawn === undefined ? `statuslinePadding ${config.padding}; statusLine does not run the mod's script`
    : drawn === config.padding ? `statuslinePadding ${config.padding}, drawn ${drawn}`
    : `statuslinePadding ${config.padding}, drawn ${drawn} from settings.json: the option is not applied`

  return [
    'daiver-prompt-view doctor',
    `settings.read: ${SETTINGS[hook](above === undefined ? 'a plugin above' : `"${above}"`)}`,
    ran('prompt.section'),
    ran('classic.Stop'),
    `padding: ${padding}`,
    `auto memory: ${memory.state === 'unknown' ? '?' : memory.state}, ${MEMORY[memory.source]}`,
    who.length === 0
      ? "skipped by: no plugin, as Claude Code's notices in this session's transcript say"
      : `skipped by: ${who.join(', ')}, as Claude Code's notices in this session's transcript say; the mod cannot get past a plugin seated above it, whoever manages that plugin (your organization's admins for a managed one) can let these hooks through`,
  ].join('\n')
}

export function registerDoctor(on: On) {
  // mod:doctor: no argument
  on('command.run', { command: DOCTOR }, async ($, e) => {
    if (e.args.trim() !== '') return { text: `Usage: /${DOCTOR}` }

    return { text: await doctorReport($) }
  }).catch(($, e, next) => failed(next.error.message ?? next.error.kind))
}
