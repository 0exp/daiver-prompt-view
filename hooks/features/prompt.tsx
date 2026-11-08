// prompt: the person's own prompts in the transcript, framed in a box of the
// theme's `prompt` color (Clawd orange by default). The frame holds the prompt's
// text alone, plain: the engine's own row paints a background under it, which
// a frame would stretch into a highlight. Task notifications, peers and
// channels are not framed (the matcher picks the composer's rows alone)
import type { On } from 'claude-code'
import { config } from '../shared/config'
import { hexOf, THEMES } from '../shared/themes'
import { noteOnScreen, noteRow } from './history'

export function registerPrompt(on: On) {
  on('ui.render', { component: 'UserMessage', props: { origin: { kind: 'composer' } } }, ($, e, next) => {
    noteRow(e.props.text, e.requestId)
    noteOnScreen(e.requestId, e.props.onScreen)
    if (!config.borders) return next(e)
    const { Box, Text } = $.ui.resolve(e)

    return (
      <Box borderStyle="round" borderColor={hexOf(THEMES[config.theme]!.prompt)} paddingX={1}>
        <Text>{e.props.text}</Text>
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
