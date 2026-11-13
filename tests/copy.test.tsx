import { expect, mock, test } from 'claude-code/testing'
import { COPIED_GLYPH, COPIED_MS, COPY_GLYPH, toolText } from '../hooks/features/copy'
import { start, world } from './world'

const FULLSCREEN = { columns: 100, rows: 40, isFullscreen: true }

const PROMPT = {
  plugin: 'daiver-prompt-view',
  component: 'UserMessage',
  requestId: 'm1',
  props: { text: 'hello **there**', origin: { kind: 'composer' }, isExpanded: false },
} as const

const REPLY = {
  plugin: 'daiver-prompt-view',
  component: 'AssistantMessage',
  requestId: 'a1',
  props: { text: 'Done.\n\n| a | b |\n| - | - |\n| 1 | 2 |', isFirstOfReply: true },
} as const

const TOOL = {
  plugin: 'daiver-prompt-view',
  component: 'ToolUse',
  requestId: 't1',
  props: {
    tool_use_id: 't1',
    tool: 'Bash',
    input: { command: 'ls -la' },
    isRunning: false,
    isErrored: false,
    isInterrupted: false,
    output: { stdout: 'a.ts\nb.ts\n', stderr: '' },
    onScreen: { from: 0, to: 5, of: 6 },
  },
} as const

const COMMAND = {
  plugin: 'daiver-prompt-view',
  component: 'CommandOutput',
  requestId: 'c1',
  props: { command: 'cost', args: '', text: 'Total cost: $0.42', isErrored: false },
} as const

test("a tool call's and a command's box copy too: the call with its result, the command's output", async ($, on) => {
  world(on, { clock: false })
  const clock = mock.clock(on)
  const copied: string[] = []
  on('ui.copy', ($, e) => {
    copied.push(e.text)
    return { value: { isCopied: true } }
  })
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  await $.session.start(start)

  for (const [row, text] of [
    [TOOL, '$ ls -la\n\na.ts\nb.ts'],
    [COMMAND, 'Total cost: $0.42'],
  ] as const) {
    const ui = await $.ui.mount({ ...row, surface: 'terminal', viewport: FULLSCREEN })
    expect((await ui.find({ type: 'Button', key: 'copy' }))?.props.label).toBe(COPY_GLYPH)
    expect((await ui.find({ type: 'Box' }))?.children.at(-1)).toMatchObject({ props: { position: 'absolute', top: 0, right: 0 } })
    await ui.press({ key: 'copy' })
    expect(copied.at(-1)).toBe(text)
    await clock.advance(COPIED_MS)
    await ui.unmount()
  }
})

test("a tool call's text: the call, then its result once it ended", () => {
  expect(toolText('Bash', { command: 'git status\ngit log' }, undefined)).toBe('$ git status\ngit log')
  expect(toolText('Bash', { command: 'x' }, { stdout: 'out', stderr: 'err' })).toBe('$ x\n\nout\nerr')
  expect(toolText('Read', { file_path: '/a/b.ts' }, 'line 1\n')).toBe('Read(/a/b.ts)\n\nline 1')
  expect(toolText('TodoWrite', {}, { ok: true })).toBe('TodoWrite\n\n{\n  "ok": true\n}')
})

test("a framed message's corner copies its text, with a ✓ for a moment", async ($, on) => {
  world(on, { clock: false })
  const clock = mock.clock(on)
  const copied: string[] = []
  on('ui.copy', ($, e) => {
    copied.push(e.text)
    return { value: { isCopied: true } }
  })
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  await $.session.start(start)

  for (const row of [PROMPT, REPLY] as const) {
    const ui = await $.ui.mount({ ...row, surface: 'terminal', viewport: FULLSCREEN })
    const button = await ui.find({ type: 'Button', key: 'copy' })
    expect(button?.props).toMatchObject({ label: COPY_GLYPH, plain: true, dimColor: true })
    // at the frame's top right, in the padding by the border
    expect((await ui.find({ type: 'Box' }))?.children.at(-1)).toMatchObject({ props: { position: 'absolute', top: 0, right: 0 } })

    await ui.press({ key: 'copy' })
    expect(copied.at(-1)).toBe(row.props.text)
    // the state the test world holds draws nothing again by itself: draw it as the write would
    await ui.redraw()
    expect((await ui.find({ type: 'Button', key: 'copy' }))?.props.label).toBe(COPIED_GLYPH)
    await clock.advance(COPIED_MS)
    await ui.redraw()
    expect((await ui.find({ type: 'Button', key: 'copy' }))?.props.label).toBe(COPY_GLYPH)
    await ui.unmount()
  }
})

test('no copy button off the fullscreen terminal', async ($, on) => {
  world(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  await $.session.start(start)

  const views = [
    { surface: 'terminal', viewport: { ...FULLSCREEN, isFullscreen: false } },
    { surface: 'terminal', viewport: undefined },
    ...(['desktop', 'vscode', 'mobile'] as const).map(surface => ({ surface, viewport: FULLSCREEN })),
  ] as const
  for (const view of views) {
    const ui = await $.ui.mount({ ...PROMPT, ...view })
    expect(await ui.find({ type: 'Button', key: 'copy' })).toBeUndefined()
    await ui.unmount()
  }
})

test('no copy button with the frames off', { options: { borders: false } }, async ($, on) => {
  world(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  await $.session.start(start)

  for (const row of [PROMPT, REPLY, TOOL, COMMAND] as const) {
    const ui = await $.ui.mount({ ...row, surface: 'terminal', viewport: FULLSCREEN })
    expect(await ui.find({ type: 'Button', key: 'copy' })).toBeUndefined()
    await ui.unmount()
  }
})
