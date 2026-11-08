// the mod's $.state contract: the prompts of the session, drawn by the history pane
// uuid: the transcript row's id, once known (session.append, or the transcript file)
export type Prompt = { text: string; at: number; uuid?: string }

declare module 'claude-code' {
  interface PluginState {
    // skip: how many of the newest prompts the history pane scrolled past (its header stays)
    // visible: the transcript rows (uuids) on screen now, as the prompt frames report them
    'daiver-prompt-view': { prompts: Shaped<Prompt[]>; skip: number; visible: string[] }
  }
}
