// command: the output row a slash command printed in the transcript (the lines
// of /reload-plugins, /cost, a plugin's command answer), framed in a box of the
// theme's `command` color (gray by default). The engine's row goes inside the
// frame as it is. The frame's top right corner holds the copy button (`copy.tsx`)
import type { On } from 'claude-code'
import { config, frameStyle } from '../shared/config'
import { hexOf, THEMES } from '../shared/themes'
import { copyCorner } from './copy'
import { noteCommandRow } from './history'

export function registerCommand(on: On) {
  on('ui.render', { component: 'CommandOutput' }, async ($, e, next) => {
    noteCommandRow(e.props.command, e.props.args, e.requestId)
    if (!config.borders || !config.chatBorders) return next(e)
    const row = await next(e)
    const corner = await copyCorner($, e, e.props.text)
    const { Box } = $.ui.resolve(e)

    return (
      <Box borderStyle={frameStyle()} borderColor={hexOf(THEMES[config.theme]!.command)} paddingX={1}>
        {row}
        {corner}
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
