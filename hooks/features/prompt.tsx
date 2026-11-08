// prompt: the person's own prompts in the transcript, framed in a box of the
// theme's `prompt` color (Clawd orange by default). The engine's row is drawn
// inside the frame as it is; task notifications, peers and channels are not
// framed (the matcher picks the composer's rows alone)
import type { On } from 'claude-code'
import { config } from '../shared/config'
import { hexOf, THEMES } from '../shared/themes'

export function registerPrompt(on: On) {
  on('ui.render', { component: 'UserMessage', props: { origin: { kind: 'composer' } } }, async ($, e, next) => {
    const row = await next(e)
    const { Box } = $.ui.resolve(e)

    return (
      <Box borderStyle="round" borderColor={hexOf(THEMES[config.theme]!.prompt)} paddingX={1}>
        {row}
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
