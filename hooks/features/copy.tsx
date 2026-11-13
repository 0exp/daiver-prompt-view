// copy: a `⧉` at the top right of a framed message (the person's prompt,
// Claude's reply) that copies the message's own text, its markdown as written,
// with nothing of the frame. It stands in the column of padding by the border:
// offsets of -1 put it outside the frame, where nothing showed on screen.
// A press shows `✓` there for a moment. Drawn in the
// fullscreen terminal alone, the one that takes clicks; on a desktop surface and
// on the main screen the frame stays as it is
import type { EngineInterface, RenderInput, RenderSurface } from 'claude-code'
import { atom, memberOf, read, update } from 'claude-code'

// how long the ✓ stays after a press
export const COPIED_MS = 1500
export const COPY_GLYPH = '⧉'
export const COPIED_GLYPH = '✓'

// whether a message's text was just copied, one per drawn row
const copied = atom({ plugin: 'daiver-prompt-view', key: 'copied' } as const, false)

async function copyText($: EngineInterface, surface: RenderSurface, text: string, requestId: string) {
  const result = await $.ui.copy({ text, surface })
  if (!result.isCopied) {
    await $.ui.log(`daiver-prompt-view: copy: nothing copied (${result.reason})`, { to: 'debug' })
    return
  }
  await update($, memberOf(copied, { requestId }), () => true)
  await $.clock.sleep(COPIED_MS)
  await update($, memberOf(copied, { requestId }), () => false)
}

// the corner button, for the frame to hold as its last child; null where it is not drawn
export async function copyCorner($: EngineInterface, e: RenderInput<'UserMessage' | 'AssistantMessage'>, text: string) {
  if (e.surface !== 'terminal' || e.viewport?.isFullscreen !== true || text.trim() === '') return null
  const isDone = (await read($, memberOf(copied, e))) ?? false
  const { Box, Button } = $.ui.resolve(e)

  return (
    <Box position="absolute" top={0} right={0}>
      <Button
        key="copy"
        label={isDone ? COPIED_GLYPH : COPY_GLYPH}
        plain
        dimColor={!isDone}
        onPress={press => void copyText($, press.surface, text, e.requestId).catch(() => undefined)}
      />
    </Box>
  )
}
