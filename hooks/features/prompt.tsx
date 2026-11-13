// prompt: the person's own prompts in the transcript, framed in a box of the
// theme's `prompt` color (Clawd orange by default). The frame holds the prompt's
// text alone, plain: the engine's own row paints a background under it, which
// a frame would stretch into a highlight. Task notifications, peers and
// channels are not framed (the matcher picks the composer's rows alone).
// The frame's top right corner holds the copy button (`copy.tsx`)
import type { On } from 'claude-code'
import { config, frameStyle } from '../shared/config'
import { hexOf, THEMES } from '../shared/themes'
import { copyCorner } from './copy'
import { noteRow } from './history'

export function registerPrompt(on: On) {
  on('ui.render', { component: 'UserMessage', props: { origin: { kind: 'composer' } } }, async ($, e, next) => {
    noteRow(e.props.text, e.requestId)
    if (!config.borders || !config.chatBorders) return next(e)
    const corner = await copyCorner($, e, e.props.text)
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box borderStyle={frameStyle()} borderColor={hexOf(THEMES[config.theme]!.prompt)} paddingX={1}>
        <Text>{e.props.text}</Text>
        {corner}
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
