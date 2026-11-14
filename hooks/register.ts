// daiver-prompt-view: the status line under the prompt (model, session, modes,
// agents, usage bars, git state, Clawd) as one mod, a file per feature
import type { Register } from 'claude-code'
import { choiceRows } from './shared/commands'
import { ANIMATIONS, BORDER_STYLES, config, HISTORY_MODES, loadConfig } from './shared/config'
import { THEME_NAMES } from './shared/themes'
import { BORDER_STYLE, BORDERS, CHAT_BORDERS, registerChat, STATUSLINE_BORDERS } from './features/chat'
import { forgetNotifiedTasks, registerAgents, startAgents } from './features/agents'
import { ANIMATE, ANIMATION, registerClodik } from './features/clodik'
import { registerCommand } from './features/command'
import { collectCommand, collectPrompt, HISTORY, HISTORY_MODE, registerHistory, startHistory } from './features/history'
import { registerPrompt } from './features/prompt'
import { registerReply } from './features/reply'
import { registerSpinner } from './features/spinner'
import { registerTool } from './features/tool'
import { commandToast, registerToasts, TOASTS } from './features/toasts'
import { registerStatusline, startStatusline, USAGE } from './features/statusline'
import { registerView, THEME } from './features/view'

export const register: Register = (on, options) => {
  loadConfig(options)

  // one start for every feature: a module hooks session.start once
  on('session.start', async ($, e, next) => {
    await startStatusline($)
    await startAgents($)
    await startHistory($)

    return next(e)
  }).catch(($, e, next) => next(e))

  // one prompt.submit for every feature: a module hooks it once without a matcher
  on('prompt.submit', async ($, e, next) => {
    forgetNotifiedTasks(e)
    await collectPrompt($, e)

    return next(e)
  }).catch(($, e, next) => next(e))

  // one command.run for every feature, first, so it wraps every command, this
  // mod's own included (they answer without next): once a command has run, the
  // toast and the history pane's row
  on('command.run', async ($, e, next) => {
    const result = await next(e)

    commandToast($, e)
    await collectCommand($, e, result)

    return result
  }).catch(($, e, next) => next(e))

  registerToasts(on)
  registerStatusline(on)
  registerAgents(on)
  registerClodik(on)
  registerPrompt(on)
  registerReply(on)
  registerTool(on)
  registerSpinner(on)
  registerCommand(on)
  registerHistory(on)
  registerChat(on)
  registerView(on)

  // the commands' values in the prompt box's typeahead
  on('prompt.autocomplete', ($, e, next) => {
    const rows = choiceRows(e, {
      [ANIMATE]: { values: ['on', 'off'], current: config.animate ? 'on' : 'off' },
      [ANIMATION]: { values: ANIMATIONS, current: config.animation },
      [THEME]: { values: THEME_NAMES, current: config.theme },
      [HISTORY]: { values: ['on', 'off'], current: config.history ? 'on' : 'off' },
      [HISTORY_MODE]: { values: HISTORY_MODES, current: config.historyMode },
      [TOASTS]: { values: ['on', 'off'], current: config.toasts ? 'on' : 'off' },
      [BORDERS]: { values: ['on', 'off'], current: config.borders ? 'on' : 'off' },
      [CHAT_BORDERS]: { values: ['on', 'off'], current: config.chatBorders ? 'on' : 'off' },
      [STATUSLINE_BORDERS]: { values: ['on', 'off'], current: config.statuslineBorders ? 'on' : 'off' },
      [BORDER_STYLE]: { values: BORDER_STYLES, current: config.borderStyle },
      [USAGE]: { values: ['on', 'off'], current: config.usage ? 'on' : 'off' },
    })

    if (rows.length === 0) return next(e)

    return next(e).then(result => ({ suggestions: [...result.suggestions, ...rows] }))
  }).catch(($, e, next) => next(e))
}
