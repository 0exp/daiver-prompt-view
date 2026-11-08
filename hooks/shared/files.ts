import type { EngineInterface } from 'claude-code'

// the mod's folder under $HOME: the status line's script copy, its config and
// theme, the agents lines and the auto memory state, a file per session
export const DIR = '.claude/daiver-prompt-view'

export async function home($: EngineInterface) {
  return `${await $.env.get('HOME')}/${DIR}`
}

// writes the file only when its text changed
export async function sync($: EngineInterface, path: string, text: string) {
  const current = (await $.fs.exists(path)) ? await $.fs.read(path) : undefined

  if (current !== text) await $.fs.write(path, text)
}
