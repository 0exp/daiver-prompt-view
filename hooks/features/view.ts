// view: what the whole status line looks like; for now its color theme, one for
// the script's lines and the agents line alike
import type { On } from 'claude-code'
import { command, failed } from '../shared/commands'
import { config, writeConfig } from '../shared/config'
import { setOption } from '../shared/options'
import { THEME_NAMES } from '../shared/themes'
import { redrawAgents } from './agents'

export const THEME = command('view', 'theme')

export function registerView(on: On) {
  // theme <name>: the theme option; the current one when no argument
  on('command.run', { command: THEME }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === '') return { text: `Status line theme: ${config.theme} (one of ${THEME_NAMES.join(', ')})` }
    if (!THEME_NAMES.includes(arg)) return { text: `Usage: /${THEME} [${THEME_NAMES.join('|')}]` }

    const deny = await setOption($, 'theme', arg)

    if (deny !== undefined) return { text: `The status line theme was not changed: ${deny}` }

    config.theme = arg
    await writeConfig($)
    await redrawAgents($)

    return { text: `The status line now uses the ${arg} theme.` }
  }).catch(($, e, next) => failed(next.error.message ?? next.error.kind))
}
