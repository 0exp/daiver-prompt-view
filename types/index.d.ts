// the mod's $.state contract: the session's prompts and Claude's answers, drawn by the history pane
// uuid: the transcript row's id, once known (session.append, or the transcript file)
export type Prompt = { text: string; at: number; uuid?: string }

// one block of Claude's answer: its text, or a tool call (`Bash(ls)`); uuid is
// the transcript row's id, toolUseId the call's (the ToolUse row a press scrolls to)
export type Answer = { kind: 'text' | 'tool'; text: string; at: number; uuid: string; toolUseId?: string }

// a slash command the person ran: its name (no slash), arguments, output, and
// the echo row's uuid once the transcript file has it
export type Ran = { name: string; args: string; output: string; at: number; uuid?: string }

declare module 'claude-code' {
  interface PluginState {
    // skip: how many of the newest messages the history pane scrolled past (its header stays)
    // subagentCalls: the tool_use ids of the calls subagents made, their rows drawn unframed
    // copied: a framed message whose text its corner button just copied, by the row's requestId
    'daiver-prompt-view': { prompts: Shaped<Prompt[]>; answers: Shaped<Answer[]>; commands: Shaped<Ran[]>; skip: number; subagentCalls: string[]; copied: StateFamily<boolean> }
  }
}
