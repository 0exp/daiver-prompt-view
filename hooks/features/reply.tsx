// reply: Claude's own replies in the transcript, each text block framed in a
// box of the theme's `reply` color (neon blue by default). The engine's drawing
// (markdown, the bullet) goes inside the frame as it is. The engine's block
// carries its own `marginTop: 1` (the gap between messages), which would be a
// blank row under the frame's top border: an inner Box pulls it back by one
// and the frame takes the gap outside instead.
// On the terminal the engine sizes a markdown table to the terminal's width,
// four columns wider than the frame's inside, so a block with a table is drawn
// by the mod (`table.tsx`): its text as the engine's markdown, its tables fitted
// to the frame
import type { On } from 'claude-code'
import { config, frameStyle } from '../shared/config'
import { hexOf, THEMES } from '../shared/themes'
import { drawReply, hasTable } from './table'

export function registerReply(on: On) {
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (!config.borders || !config.chatBorders) return next(e)
    const frame = { borderStyle: frameStyle(), borderColor: hexOf(THEMES[config.theme]!.reply), paddingX: 1, marginTop: 1 }

    if (e.surface === 'terminal' && !e.props.isSummary && hasTable(e.props.text)) {
      const t = $.ui.resolve(e)
      const { Box } = t
      return <Box {...frame}>{drawReply(t, e.props.text, e.props.isFirstOfReply)}</Box>
    }

    const block = await next(e)
    const { Box } = $.ui.resolve(e)

    return (
      <Box {...frame}>
        <Box flexDirection="column" marginTop={-1}>
          {block}
        </Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
