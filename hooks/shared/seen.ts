// how many times each of the mod's hooks a plugin above may pass by has run
// since the mod loaded, for /daiver-prompt-view:mod:doctor
export const WATCHED = ['settings.read', 'prompt.section', 'classic.Stop'] as const
export type Watched = (typeof WATCHED)[number]

export const seen: Record<Watched, number> = { 'settings.read': 0, 'prompt.section': 0, 'classic.Stop': 0 }

export const markSeen = (hook: Watched) => {
  seen[hook] += 1
}
