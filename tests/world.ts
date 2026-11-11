import type { On } from 'claude-code'
import { mock } from 'claude-code/testing'

export const DIR = '/home/me/.claude/daiver-prompt-view'

// the world beneath the plugin: a filesystem in memory (the shipped script and
// what the plugin writes), no agents, the plugin's /config rows and their changes
// `configRows: false`: the plugin's /config rows filtered out, as a plugin above may
export function world(on: On, { configRows = true } = {}) {
  const files = new Map<string, string>()
  const sets: string[] = []
  const state = new Map<string, { value: unknown; version: number }>()
  const panes = { open: [] as string[], closed: [] as string[], background: undefined as unknown }
  const toasts: string[] = []
  const logs: string[] = []

  on('fs.exists', ($, e) => ({ value: files.has(e.path) || e.path.endsWith('/statusline/daiver-prompt-view.sh') }))
  on('fs.read', ($, e) => ({ value: files.get(e.path) ?? '#!/bin/sh\n' }))
  mock.env(on, { HOME: '/home/me' })
  on('fs.write', ($, e) => {
    files.set(e.path, e.text)
    return { value: undefined }
  })
  on('agent.list', () => ({ value: [] }))
  on('session.id', () => ({ value: 's1' }))
  on('session.cwd', () => ({ value: '/home/me/proj' }))
  on('clock.now', () => ({ value: 0 }))
  on('settings.read', () => ({ value: {} }))
  on('command.register', ($, e) => ({ value: { command: e.name } }))
  on('state.get', ($, e) => ({ value: state.get(`${e.plugin}.${e.key}`) ?? { value: undefined, version: 0 } }))
  on('state.set', ($, e) => {
    const version = (state.get(`${e.plugin}.${e.key}`)?.version ?? 0) + 1
    state.set(`${e.plugin}.${e.key}`, { value: e.value, version })
    return { value: { isSet: true, version } }
  })
  on('ui.open', ($, e) => {
    if (!panes.open.includes(e.id)) panes.open.push(e.id)
    panes.background = e.backgroundColor
    return { value: { isPlaced: true } }
  })
  on('ui.close', ($, e) => {
    panes.open = panes.open.filter(id => id !== e.id)
    panes.closed.push(e.id)
    return { value: undefined }
  })
  on('prompt.submit', ($, e) => ({ text: e.text }))
  on('ui.toast', ($, e) => {
    toasts.push(e.text)
    return { value: undefined }
  })
  on('ui.log', ($, e) => {
    logs.push(e.text)
    return { value: undefined }
  })
  const provider = { plugin: 'daiver-prompt-view', tier: 'user' } as const
  on('config.list', $ => ({
    value: !configRows ? [] : [
      { key: `${$.plugin.name}.clodikAnimate`, label: 'Animate Clawd always', kind: 'boolean', value: false, provider, isLocked: false },
      { key: `${$.plugin.name}.clodikAnimation`, label: "Clawd's animation", kind: 'choice', value: 'random', provider, isLocked: false },
      { key: `${$.plugin.name}.theme`, label: 'Color theme', kind: 'choice', value: 'default', provider, isLocked: false },
      { key: `${$.plugin.name}.history`, label: 'Show the prompt history pane', kind: 'boolean', value: false, provider, isLocked: false },
      { key: `${$.plugin.name}.borders`, label: 'Show the frames', kind: 'boolean', value: true, provider, isLocked: false },
      { key: `${$.plugin.name}.chatBorders`, label: "Show the chat's frames", kind: 'boolean', value: true, provider, isLocked: false },
      { key: `${$.plugin.name}.statuslineBorders`, label: "Show the status line's frame", kind: 'boolean', value: true, provider, isLocked: false },
      { key: `${$.plugin.name}.borderStyle`, label: 'Frame style', kind: 'choice', value: 'dashed', provider, isLocked: false },
    ],
  }))
  on('config.set', ($, e) => {
    sets.push(`${e.key.split('.').at(-1)}=${e.value}`)
    return { value: e.value }
  })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('prompt.autocomplete', () => ({ suggestions: [] }))

  return { files, sets, panes, toasts, logs, state, config: () => files.get(`${DIR}/config`), agents: () => files.get(`${DIR}/agents/s1`) }
}

export const start = { cwd: '/tmp', surface: 'terminal', isInteractive: true } as const

// a command of the plugin typed at the prompt: /daiver-prompt-view:<feature>:<name> <args>
export const run = (command: string, args = '') => ({
  command: `daiver-prompt-view:${command}`,
  args,
  origin: { kind: 'composer' },
  presentation: { isFullscreen: false, columns: 120 },
}) as const

// the prompt box with the caret at the end, as prompt.autocomplete sees it
export const typed = (text: string) => {
  const start = text.lastIndexOf(' ') + 1
  return { text, cursor: text.length, token: text.slice(start), start }
}

export const conf = (clodik: boolean, animate: boolean, animation: string, theme = 'default', history = false, borders = true, statuslineBorders = true, chatBorders = true, borderStyle = 'dashed') =>
  `clodik=${clodik}\nanimate=${animate}\nanimation=${animation}\ntheme=${theme}\nhistory=${history}\nborders=${borders}\nchatBorders=${chatBorders}\nstatuslineBorders=${statuslineBorders}\nborderStyle=${borderStyle}\n`
