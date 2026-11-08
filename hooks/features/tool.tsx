// tool: the tool calls' rows in the transcript (`Bash(ls)` and the result),
// each framed in a box of the theme's `tool` color (neon blue by default). The
// engine's row goes inside the frame as it is, less the blank line its own top
// margin would leave under the border
import type { On } from 'claude-code'
import { config } from '../shared/config'
import { hexOf, THEMES } from '../shared/themes'

export function registerTool(on: On) {
  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const row = await next(e)
    const { Box } = $.ui.resolve(e)

    return (
      <Box borderStyle="round" borderColor={hexOf(THEMES[config.theme]!.tool)} paddingX={1}>
        <Box marginTop={-1}>{row}</Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
