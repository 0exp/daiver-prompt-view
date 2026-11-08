// spinner: the line that animates while a turn runs (`Sauteing... (12s)`),
// framed in a box of the theme's `spinner` color (yellow-green by default).
// The engine's line goes inside the frame as it is, less the blank line its own
// top margin would leave under the border
import type { On } from 'claude-code'
import { config } from '../shared/config'
import { hexOf, THEMES } from '../shared/themes'

export function registerSpinner(on: On) {
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    const line = await next(e)
    const { Box } = $.ui.resolve(e)

    return (
      <Box borderStyle="round" borderColor={hexOf(THEMES[config.theme]!.spinner)} paddingX={1}>
        <Box marginTop={-1}>{line}</Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
