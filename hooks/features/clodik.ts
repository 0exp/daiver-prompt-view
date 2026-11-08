// clodik: Clawd, Claude's mascot, at the status line's right edge. The script
// draws it; these are its commands, each setting the option of the same name
import type { On } from 'claude-code'
import { command, failed } from '../shared/commands'
import { ANIMATIONS, config, writeConfig } from '../shared/config'
import { setOption } from '../shared/options'

export const ANIMATE = command('clodik', 'animate')
export const ANIMATION = command('clodik', 'animation')

export function registerClodik(on: On) {
  // animate [on|off]: the clodikAnimate option, toggled when no argument
  on('command.run', { command: ANIMATE }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg !== '' && arg !== 'on' && arg !== 'off') return { text: `Usage: /${ANIMATE} [on|off]` }

    const value = arg === '' ? !config.animate : arg === 'on'
    const deny = await setOption($, 'clodikAnimate', value)

    if (deny !== undefined) return { text: `Clawd's animation was not changed: ${deny}` }

    config.animate = value
    await writeConfig($)

    return { text: value ? 'Clawd now animates all the time.' : 'Clawd now animates only while Claude Code is busy.' }
  }).catch(($, e, next) => failed(next.error.message ?? next.error.kind))

  // animation <name>: the clodikAnimation option; the current one when no argument
  on('command.run', { command: ANIMATION }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()

    if (arg === '') return { text: `Clawd's animation: ${config.animation} (one of ${ANIMATIONS.join(', ')})` }
    if (!ANIMATIONS.includes(arg)) return { text: `Usage: /${ANIMATION} [${ANIMATIONS.join('|')}]` }

    const deny = await setOption($, 'clodikAnimation', arg)

    if (deny !== undefined) return { text: `Clawd's animation was not changed: ${deny}` }

    config.animation = arg
    await writeConfig($)

    return { text: arg === 'random' ? 'Clawd now plays a random animation.' : `Clawd now plays ${arg}.` }
  }).catch(($, e, next) => failed(next.error.message ?? next.error.kind))
}
