// the mod's $.state contract: the prompts of the session, drawn by the history pane
export type Prompt = { text: string; at: number }

declare module 'claude-code' {
  interface PluginState {
    'daiver-prompt-view': { prompts: Shaped<Prompt[]> }
  }
}
