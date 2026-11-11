// spinner: the line that animates while a turn runs (`Sauteing... (12s)`),
// framed in a box of the theme's `spinner` color (the output style's yellow by default).
// The engine's line goes inside the frame as it is. It carries its own
// `marginTop: 1` (the gap above it), which would be a blank row under the
// frame's top border: an inner Box pulls it back by one and the frame takes
// the gap outside instead
import type { On } from 'claude-code'
import { config, frameStyle } from '../shared/config'
import { hexOf, THEMES } from '../shared/themes'

export function registerSpinner(on: On) {
  on('ui.render', { component: 'Spinner' }, async ($, e, next) => {
    if (!config.borders || !config.chatBorders) return next(e)
    const line = await next(e)
    const { Box } = $.ui.resolve(e)

    return (
      <Box borderStyle={frameStyle()} borderColor={hexOf(THEMES[config.theme]!.spinner)} paddingX={1} marginTop={1}>
        <Box flexDirection="column" marginTop={-1}>
          {line}
        </Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
