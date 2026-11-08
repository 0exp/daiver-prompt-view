// command: the output row a slash command printed in the transcript (the lines
// of /reload-plugins, /cost, a plugin's command answer), framed in a box of the
// theme's `command` color (gray by default). The engine's row goes inside the
// frame as it is
import type { On } from 'claude-code'
import { config } from '../shared/config'
import { hexOf, THEMES } from '../shared/themes'

export function registerCommand(on: On) {
  on('ui.render', { component: 'CommandOutput' }, async ($, e, next) => {
    if (!config.borders) return next(e)
    const row = await next(e)
    const { Box } = $.ui.resolve(e)

    return (
      <Box borderStyle="round" borderColor={hexOf(THEMES[config.theme]!.command)} paddingX={1}>
        {row}
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
