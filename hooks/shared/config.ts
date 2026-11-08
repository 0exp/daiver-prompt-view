import type { EngineInterface } from 'claude-code'
import { home, sync } from './files'
import { themeOf, themeShell } from './themes'

// Clawd's animations, as the script and the clodikAnimation option name them
export const ANIMATIONS = ['random', 'jump', 'spin', 'sway', 'blink', 'cheer', 'wave', 'stretch', 'hop', 'tap', 'shiver', 'pixels', 'matrix']

// the options the status line script reads, from the plugin's userConfig;
// a change in /config reloads the module, and session.start fires again
export const config = { clodik: true, animate: false, animation: 'random', theme: 'default', resources: true }

export function loadConfig(options: Record<string, unknown>) {
  config.clodik = options.clodik !== false
  config.animate = options.clodikAnimate === true
  config.animation = ANIMATIONS.includes(String(options.clodikAnimation)) ? String(options.clodikAnimation) : 'random'
  config.theme = themeOf(options.theme)
  config.resources = options.resources !== false
}

// the config file and the active theme's colors, next to the script
export async function writeConfig($: EngineInterface) {
  const dir = await home($)

  await sync($, `${dir}/config`, `clodik=${config.clodik}\nanimate=${config.animate}\nanimation=${config.animation}\ntheme=${config.theme}\nresources=${config.resources}\n`)
  await sync($, `${dir}/theme.sh`, themeShell(config.theme))
}
