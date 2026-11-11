// reply: Claude's own replies in the transcript, each text block framed in a
// box of the theme's `reply` color (neon blue by default). The engine's drawing
// (markdown, the bullet) goes inside the frame as it is
import type { On } from 'claude-code'
import { config, frameStyle } from '../shared/config'
import { hexOf, THEMES } from '../shared/themes'

export function registerReply(on: On) {
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (!config.borders || !config.chatBorders) return next(e)
    const block = await next(e)
    const { Box } = $.ui.resolve(e)

    return (
      <Box borderStyle={frameStyle()} borderColor={hexOf(THEMES[config.theme]!.reply)} paddingX={1}>
        {block}
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
