import type { EngineInterface } from 'claude-code'
import { home, sync } from './files'
import { themeOf, themeShell } from './themes'

// Clawd's animations, as the script and the clodikAnimation option name them
export const ANIMATIONS = ['random', 'jump', 'spin', 'sway', 'blink', 'cheer', 'wave', 'stretch', 'hop', 'tap', 'shiver', 'pixels', 'matrix']

// the frames' styles, as the borderStyle option names them, and the Box
// border each one is drawn with: `dashed`, or `line` a solid one
export const BORDER_STYLES = ['dashed', 'line']
export const frameStyle = () => (config.borderStyle === 'line' ? 'round' : 'dashed')

// statusLine.padding, as the statuslinePadding option holds it: the columns
// added to Claude Code's own 2 on each side of the status line, -2 the least
export const PADDING = { min: -2, max: 20, default: -1 }
export function paddingOf(value: unknown) {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(n) && n >= PADDING.min && n <= PADDING.max ? n : PADDING.default
}

// the options the status line script reads, from the plugin's userConfig;
// a change in /config reloads the module, and session.start fires again
export const config = { clodik: true, animate: false, animation: 'random', theme: 'default', history: false, borders: true, chatBorders: true, statuslineBorders: true, borderStyle: 'dashed', padding: PADDING.default }

export function loadConfig(options: Record<string, unknown>) {
  config.clodik = options.clodik !== false
  config.animate = options.clodikAnimate === true
  config.animation = ANIMATIONS.includes(String(options.clodikAnimation)) ? String(options.clodikAnimation) : 'random'
  config.theme = themeOf(options.theme)
  config.history = options.history === true
  config.borders = options.borders !== false
  config.chatBorders = options.chatBorders !== false
  config.statuslineBorders = options.statuslineBorders !== false
  config.borderStyle = BORDER_STYLES.includes(String(options.borderStyle)) ? String(options.borderStyle) : 'dashed'
  config.padding = paddingOf(options.statuslinePadding)
}

// the config file and the active theme's colors, next to the script
export async function writeConfig($: EngineInterface) {
  const dir = await home($)

  await sync($, `${dir}/config`, `clodik=${config.clodik}\nanimate=${config.animate}\nanimation=${config.animation}\ntheme=${config.theme}\nhistory=${config.history}\nborders=${config.borders}\nchatBorders=${config.chatBorders}\nstatuslineBorders=${config.statuslineBorders}\nborderStyle=${config.borderStyle}\npadding=${config.padding}\n`)
  await sync($, `${dir}/theme.sh`, themeShell(config.theme))
}
