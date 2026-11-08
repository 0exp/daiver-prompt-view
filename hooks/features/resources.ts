// resources: the RAM and CPU line under the bars. The script draws it; this is
// its command, setting the `resources` option
import type { On } from 'claude-code'
import { command, failed } from '../shared/commands'
import { config, writeConfig } from '../shared/config'
import { setOption } from '../shared/options'

export const SHOW = command('resources', 'show')

export function registerResources(on: On) {
  // show [on|off]: the resources option, toggled when no argument
  on('command.run', { command: SHOW }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg !== '' && arg !== 'on' && arg !== 'off') return { text: `Usage: /${SHOW} [on|off]` }

    const value = arg === '' ? !config.resources : arg === 'on'
    const deny = await setOption($, 'resources', value)

    if (deny !== undefined) return { text: `The RAM and CPU line was not changed: ${deny}` }

    config.resources = value
    await writeConfig($)

    return { text: value ? 'The status line now shows RAM and CPU.' : 'The status line no longer shows RAM and CPU.' }
  }).catch(($, e, next) => failed(next.error.message ?? next.error.kind))
}
