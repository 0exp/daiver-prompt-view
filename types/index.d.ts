// the mod's $.state contract: the session's prompts and Claude's answers, drawn by the history pane
// uuid: the transcript row's id, once known (session.append, or the transcript file)
export type Prompt = { text: string; at: number; uuid?: string }

// one block of Claude's answer: its text, or a tool call (`Bash(ls)`); uuid is
// the transcript row's id, toolUseId the call's (the ToolUse row a press scrolls to)
export type Answer = { kind: 'text' | 'tool'; text: string; at: number; uuid: string; toolUseId?: string }

declare module 'claude-code' {
  interface PluginState {
    // skip: how many of the newest messages the history pane scrolled past (its header stays)
    'daiver-prompt-view': { prompts: Shaped<Prompt[]>; answers: Shaped<Answer[]>; skip: number }
  }
}
