// tool: the tool calls' rows in the transcript (`Bash(ls)` and the result),
// each framed in a box of the theme's `tool` color (neon blue by default). The
// engine's row goes inside the frame as it is. The engine's row carries its
// own `marginTop: 1` (the gap between messages), which would be a blank row
// under the frame's top border: an inner Box pulls it back by one and the
// frame takes the gap outside instead
import type { On } from 'claude-code'
import { config, frameStyle } from '../shared/config'
import { hexOf, THEMES } from '../shared/themes'

export function registerTool(on: On) {
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    if (!config.borders || !config.chatBorders) return next(e)
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
