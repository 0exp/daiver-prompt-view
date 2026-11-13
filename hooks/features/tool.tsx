// tool: the tool calls' rows in the transcript (`Bash(ls)` and the result),
// each framed in a box of the theme's `tool` color (neon blue by default). The
// engine's row goes inside the frame as it is. The engine's row carries its
// own `marginTop: 1` (the gap between messages), which would be a blank row
// under the frame's top border: an inner Box pulls it back by one and the
// frame takes the gap outside instead.
// A subagent's calls are left as the engine draws them: under a running
// `Agent(...)` row the engine shows them as its progress, each in a slot one
// row tall with no top margin, where a frame (two borders, the margin pulled
// back) leaves nothing but its two borders.
// A row the engine draws empty (a call it shows nothing for) is left unframed
// too, told by its height (`onScreen.of`, where the surface reports it): framed,
// an empty row is the gap and the two borders, three rows at most, a real one
// four at least; once bare it stays so while the engine's row is the gap alone
// or less, and is framed again when the row grows (two rows or more)
import type { EngineInterface, On } from 'claude-code'
import { atom, read, update } from 'claude-code'
import { config, frameStyle } from '../shared/config'
import { hexOf, THEMES } from '../shared/themes'

// the newest subagent calls kept
const KEEP = 500

// the rows a frame would leave empty: an empty row framed is this tall at most
const EMPTY_FRAMED = 3
// a bare row this tall at least has something of its own: framed again
const GROWN_BARE = 2
// the newest rows whose drawing is remembered
const KEEP_DRAWN = 1000

// how each row was last drawn, by its tool_use_id: bare (left empty by the
// engine) or framed; the module's own, since a render hook never writes state,
// and lost on a reload, where a row is framed and measured again
const drawn = new Map<string, 'bare' | 'framed'>()

// whether a row is drawn bare: its last drawing and the height it was laid out at
export function isBare(last: 'bare' | 'framed' | undefined, rows: number | undefined) {
  if (last === 'bare') return rows === undefined || rows < GROWN_BARE
  return rows !== undefined && rows <= EMPTY_FRAMED
}

function remember(id: string, how: 'bare' | 'framed') {
  drawn.delete(id)
  drawn.set(id, how)
  if (drawn.size > KEEP_DRAWN) drawn.delete(drawn.keys().next().value!)
}

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

    const id = e.props.tool_use_id
    if (isBare(drawn.get(id), e.props.onScreen?.of)) {
      remember(id, 'bare')
      return next(e)
    }
    remember(id, 'framed')

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
