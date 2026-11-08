// daiver-prompt-view: the status line under the prompt (model, session, modes,
// agents, usage bars, git state, Clawd) as one mod, a file per feature
import type { Register } from 'claude-code'
import { choiceRows } from './shared/commands'
import { ANIMATIONS, config, loadConfig } from './shared/config'
import { THEME_NAMES } from './shared/themes'
import { registerAgents, startAgents } from './features/agents'
import { ANIMATE, ANIMATION, registerClodik } from './features/clodik'
import { registerResources, SHOW } from './features/resources'
import { registerStatusline, startStatusline } from './features/statusline'
import { registerView, THEME } from './features/view'

export const register: Register = (on, options) => {
  loadConfig(options)

  // one start for every feature: a module hooks session.start once
  on('session.start', async ($, e, next) => {
    await startStatusline($)
    await startAgents($)

    return next(e)
  }).catch(($, e, next) => next(e))

  registerStatusline(on)
  registerAgents(on)
  registerClodik(on)
  registerResources(on)
  registerView(on)

  // the commands' values in the prompt box's typeahead
  on('prompt.autocomplete', ($, e, next) => {
    const rows = choiceRows(e, {
      [ANIMATE]: { values: ['on', 'off'], current: config.animate ? 'on' : 'off' },
      [ANIMATION]: { values: ANIMATIONS, current: config.animation },
      [THEME]: { values: THEME_NAMES, current: config.theme },
      [SHOW]: { values: ['on', 'off'], current: config.resources ? 'on' : 'off' },
    })

    if (rows.length === 0) return next(e)

    return next(e).then(result => ({ suggestions: [...result.suggestions, ...rows] }))
  }).catch(($, e, next) => next(e))
}
