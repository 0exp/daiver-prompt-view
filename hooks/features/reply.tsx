// reply: Claude's own replies in the transcript, each text block framed in a
// box of the theme's `reply` color (neon blue by default). The engine's drawing
// (markdown, the bullet) goes inside the frame as it is. The engine's block
// carries its own `marginTop: 1` (the gap between messages), which would be a
// blank row under the frame's top border: an inner Box pulls it back by one
// and the frame takes the gap outside instead
import type { On } from 'claude-code'
import { config, frameStyle } from '../shared/config'
import { hexOf, THEMES } from '../shared/themes'

export function registerReply(on: On) {
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (!config.borders || !config.chatBorders) return next(e)
    const block = await next(e)
    const { Box } = $.ui.resolve(e)

    return (
      <Box borderStyle={frameStyle()} borderColor={hexOf(THEMES[config.theme]!.reply)} paddingX={1} marginTop={1}>
        <Box flexDirection="column" marginTop={-1}>
          {block}
        </Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
