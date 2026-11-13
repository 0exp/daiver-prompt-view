// copy: a `⧉` at the top right of every framed box in the transcript (the
// person's prompt, Claude's reply, a tool call, a slash command's output) that
// copies the box's own text, its markdown as written, with nothing of the frame.
// A tool call copies as the call and its result (`toolText`). It stands one
// column in from the border (`COPY_RIGHT`), not pressed against it: offsets
// of -1 put it outside the frame, where nothing showed on screen.
// A press shows `✓` there for a moment. Drawn in the
// fullscreen terminal alone, the one that takes clicks; on a desktop surface and
// on the main screen the frame stays as it is
import type { EngineInterface, RenderInput, RenderSurface } from 'claude-code'
import { atom, memberOf, read, update } from 'claude-code'
import { toolLine } from './history'

// how long the ✓ stays after a press
export const COPIED_MS = 1500
export const COPY_GLYPH = '⧉'
export const COPIED_GLYPH = '✓'
// the columns between the button and the frame's right border
export const COPY_RIGHT = 1

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

// the text of a result: as it is, Bash's stdout and stderr, else its JSON
function resultText(output: unknown) {
  if (output === undefined || output === null) return ''
  if (typeof output === 'string') return output
  if (typeof output === 'object' && typeof (output as { stdout?: unknown }).stdout === 'string') {
    const { stdout, stderr } = output as { stdout: string; stderr?: unknown }
    return [stdout, typeof stderr === 'string' ? stderr : ''].filter(part => part.trim() !== '').join('\n')
  }
  return JSON.stringify(output, null, 2)
}

// what a tool call's box copies: the call (a Bash call as its whole command,
// `$ ls -la`, any other as `Read(/a/b.ts)`) and, once it ended, its result
export function toolText(tool: string, input: unknown, output: unknown) {
  const command = (input as { command?: unknown } | null)?.command
  const call = tool === 'Bash' && typeof command === 'string' ? `$ ${command}` : toolLine(tool, input)
  const result = resultText(output).trimEnd()
  return result === '' ? call : `${call}\n\n${result}`
}

// the corner button, for the frame to hold as its last child; null where it is not drawn
export async function copyCorner($: EngineInterface, e: RenderInput<'UserMessage' | 'AssistantMessage' | 'ToolUse' | 'CommandOutput'>, text: string) {
  if (e.surface !== 'terminal' || e.viewport?.isFullscreen !== true || text.trim() === '') return null
  const isDone = (await read($, memberOf(copied, e))) ?? false
  const { Box, Button } = $.ui.resolve(e)

  return (
    <Box position="absolute" top={0} right={COPY_RIGHT}>
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
