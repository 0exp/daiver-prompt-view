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

// the session's transcript file: ~/.claude/projects/<cwd, every other
// character a dash>/<session id>.jsonl, a JSON row per line
export async function transcriptPath($: EngineInterface) {
  const slug = (await $.session.cwd()).replace(/[^A-Za-z0-9]/g, '-')

  return `${await $.env.get('HOME')}/.claude/projects/${slug}/${await $.session.id()}.jsonl`
}
