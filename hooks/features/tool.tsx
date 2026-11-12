// tool: the tool calls' rows in the transcript (`Bash(ls)` and the result),
// each framed in a box of the theme's `tool` color (neon blue by default). The
// engine's row goes inside the frame as it is. The engine's row carries its
// own `marginTop: 1` (the gap between messages), which would be a blank row
// under the frame's top border: an inner Box pulls it back by one and the
// frame takes the gap outside instead.
// A subagent's calls are left as the engine draws them: under a running
// `Agent(...)` row the engine shows them as its progress, each in a slot one
// row tall with no top margin, where a frame (two borders, the margin pulled
// back) leaves nothing but its two borders
import type { EngineInterface, On } from 'claude-code'
import { atom, read, update } from 'claude-code'
import { config, frameStyle } from '../shared/config'
import { hexOf, THEMES } from '../shared/themes'

// the newest subagent calls kept
const KEEP = 500

// the ids of the tool calls subagents made (`tool_use_id`), drawn unframed
const subagentCalls = atom({ plugin: 'daiver-prompt-view', key: 'subagentCalls' } as const, [])

// a subagent's calls, as soon as they are known (its response's row, its
// tool.call): their rows redraw unframed
export async function noteSubagentCalls($: EngineInterface, ids: readonly string[]) {
  if (ids.length === 0) return

  await update($, subagentCalls, stored => {
    const list: readonly string[] = stored ?? []
    const fresh = ids.filter(id => !list.includes(id))
    return fresh.length === 0 ? [...list] : [...list, ...fresh].slice(-KEEP)
  })
}

export function registerTool(on: On) {
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (!config.borders || !config.chatBorders) return next(e)
    if (((await read($, subagentCalls)) ?? []).includes(e.props.tool_use_id)) return next(e)

    const row = await next(e)
    const { Box } = $.ui.resolve(e)

    return (
      <Box borderStyle={frameStyle()} borderColor={hexOf(THEMES[config.theme]!.tool)} paddingX={1} marginTop={1}>
        <Box flexDirection="column" marginTop={-1}>
          {row}
        </Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
