import type { EngineInterface } from 'claude-code'
import { home, sync } from './files'
import { themeOf, themeShell } from './themes'

// Clawd's animations, as the script and the clodikAnimation option name them
export const ANIMATIONS = ['random', 'jump', 'spin', 'sway', 'blink', 'cheer', 'wave', 'stretch', 'hop', 'tap', 'shiver', 'pixels', 'matrix']

// the frames' styles, as the borderStyle option names them, and the Box
// border each one is drawn with: `dashed`, or `line` a solid one
export const BORDER_STYLES = ['dashed', 'line']
export const frameStyle = () => (config.borderStyle === 'line' ? 'round' : 'dashed')
// the history pane's message under the pointer: dashed, its dots, over solid
// frames; over dashed frames (dots already) the solid one, so the change shows
export const hoverStyle = () => (frameStyle() === 'dashed' ? 'round' : 'dashed')

// what the history pane lists, as the historyMode option names it: the whole
// story (prompts and answers), the person's prompts alone, Claude's answers alone
export const HISTORY_MODES = ['fullstory', 'questions', 'answers']

// how the status line draws the ctx, lmt, rst and pch bars, as the
// statuslineView option names it: `line-view` (the default) one line, ctx lmt
// rst pch, with no rules and no block around Clawd; `block-view` a block of two
// lines between rules, Clawd in a block of his own
export const STATUSLINE_VIEWS = ['line-view', 'block-view']

// statusLine.padding, as the statuslinePadding option holds it: the columns
// added to Claude Code's own 2 on each side of the status line, -2 the least
export const PADDING = { min: -2, max: 20, default: -1 }
export function paddingOf(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(n) && n >= PADDING.min && n <= PADDING.max ? n : PADDING.default
}

// the most characters of a subagent's current work on its agents row, as the
// agentActivityLength option holds it; 0 hides it
export const ACTIVITY_LENGTH = { min: 0, max: 200, default: 40 }
export function activityLengthOf(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(n) && n >= ACTIVITY_LENGTH.min && n <= ACTIVITY_LENGTH.max ? n : ACTIVITY_LENGTH.default
}

// the options the status line script reads, from the plugin's userConfig;
// a change in /config reloads the module, and session.start fires again
export const config = { clodik: true, animate: false, animation: 'matrix', theme: 'default', history: false, historyMode: 'fullstory', toasts: false, buttons: true, borders: true, chatBorders: true, statuslineBorders: true, usage: true, weekReset: false, view: 'line-view', borderStyle: 'dashed', padding: PADDING.default, activityLength: ACTIVITY_LENGTH.default, drawnPadding: undefined as number | undefined }

export function loadConfig(options: Record<string, unknown>) {
  config.clodik = options.clodik !== false
  config.animate = options.clodikAnimate === true
  config.animation = ANIMATIONS.includes(String(options.clodikAnimation)) ? String(options.clodikAnimation) : 'matrix'
  config.theme = themeOf(options.theme)
  config.history = options.history === true
  config.toasts = options.toasts === true
  config.buttons = options.buttons !== false
  config.historyMode = HISTORY_MODES.includes(String(options.historyMode)) ? String(options.historyMode) : 'fullstory'
  config.borders = options.borders !== false
  config.chatBorders = options.chatBorders !== false
  config.statuslineBorders = options.statuslineBorders !== false
  config.usage = options.statuslineUsage !== false
  config.weekReset = options.statuslineWeekReset === true
  config.view = STATUSLINE_VIEWS.includes(String(options.statuslineView)) ? String(options.statuslineView) : 'line-view'
  config.borderStyle = BORDER_STYLES.includes(String(options.borderStyle)) ? String(options.borderStyle) : 'dashed'
  config.padding = paddingOf(options.statuslinePadding)
  config.activityLength = activityLengthOf(options.agentActivityLength)
}

// the config as the userConfig options name it, loadConfig's input
function optionsOf(): Record<string, unknown> {
  return {
    clodik: config.clodik, clodikAnimate: config.animate, clodikAnimation: config.animation, theme: config.theme,
    history: config.history, toasts: config.toasts, buttons: config.buttons, historyMode: config.historyMode,
    borders: config.borders, chatBorders: config.chatBorders, statuslineBorders: config.statuslineBorders,
    statuslineUsage: config.usage, statuslineWeekReset: config.weekReset, statuslineView: config.view, borderStyle: config.borderStyle, statuslinePadding: config.padding,
    agentActivityLength: config.activityLength,
  }
}

// the config file is one for every session, each writing it again every few
// seconds: before that, a session takes the options as /config saved them (by
// another session too), so no session writes back a value changed elsewhere.
// The history pane stays the session's own (it opens and closes there alone);
// an option with no saved row keeps the session's value. True when one changed
export function adoptSaved(saved: Record<string, unknown>) {
  const before = JSON.stringify(optionsOf())
  const history = config.history

  loadConfig({ ...optionsOf(), ...saved })
  config.history = history

  return JSON.stringify(optionsOf()) !== before
}

// the config file and the active theme's colors, next to the script: the
// session's own (configs/<session id>, themes/<session id>.sh), which its
// status line reads, so sessions that disagree for a while (one changed an
// option, another has not adopted it yet, each with its own padding and history
// pane) do not overwrite each other's every few seconds; and the shared ones,
// for a status line input with no session id
export async function writeConfig($: EngineInterface) {
  const dir = await home($)
  const id = await $.session.id()
  const text = `clodik=${config.clodik}\nanimate=${config.animate}\nanimation=${config.animation}\ntheme=${config.theme}\nhistory=${config.history}\nborders=${config.borders}\nchatBorders=${config.chatBorders}\nstatuslineBorders=${config.statuslineBorders}\nborderStyle=${config.borderStyle}\npadding=${config.drawnPadding ?? config.padding}\nusage=${config.usage}\nweekReset=${config.weekReset}\nview=${config.view}\n`
  const theme = themeShell(config.theme)

  await sync($, `${dir}/configs/${id}`, text)
  await sync($, `${dir}/themes/${id}.sh`, theme)
  await sync($, `${dir}/config`, text)
  await sync($, `${dir}/theme.sh`, theme)
}
