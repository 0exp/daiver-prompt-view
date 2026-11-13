import { expect, test } from 'claude-code/testing'
import { start, world } from './world'

const BLOCK = {
  plugin: 'daiver-prompt-view',
  component: 'AssistantMessage',
  requestId: 'a1',
  props: { text: 'Done.', isFirstOfReply: true },
} as const

test("a reply block is framed in the theme's reply color, the engine's drawing inside", async ($, on) => {
  world(on)
  // the engine's own block beneath the plugin
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{'● ' + (e.props as { text: string }).text}</Text>
  })

  await $.session.start(start)

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BLOCK, surface })
    const box = await ui.find({ type: 'Box' })

    expect(box?.props.borderStyle).toBe('dashed')
    expect(box?.props.borderColor).toBe('#00c8ff')
    expect(box?.props.marginTop).toBe(1)
    // the engine's own top margin pulled back inside, no blank row under the border
    expect((box?.children[0] as { props: { marginTop?: number } }).props.marginTop).toBe(-1)
    expect((await ui.find({ type: 'Text', text: /Done/ }))?.text).toBe('● Done.')
    await ui.unmount()
  }
})

const TABLE = [
  'Intro line.',
  '',
  '| Key | Value | Notes |',
  '| --- | :---: | ---: |',
  '| alpha | `one` | a fairly long note |',
  '| beta \\| gamma | five |',
  '',
  'Outro.',
].join('\n')

type Node = { type: string; props: Record<string, unknown>; children?: (Node | string)[] }

function all(node: Node | string, found: Node[] = []): Node[] {
  if (typeof node === 'string') return found
  found.push(node)
  for (const child of node.children ?? []) all(child, found)
  return found
}

function textOf(node: Node | string): string {
  return typeof node === 'string' ? node : (node.children ?? []).map(textOf).join('')
}

test('a reply with a table is drawn by the mod on the terminal, its table fitted to the frame', async ($, on) => {
  world(on)
  const engine: string[] = []
  on('ui.render', ($, e) => {
    engine.push(e.surface)
    const { Text } = $.ui.resolve(e)
    return <Text>{'● ' + (e.props as { text: string }).text}</Text>
  })

  await $.session.start(start)

  const ui = await $.ui.mount({ ...BLOCK, surface: 'terminal', props: { text: TABLE, isFirstOfReply: true } })
  const nodes = all(await ui.drawn() as Node)
  const frame = nodes[0]!

  expect(engine).toEqual([])
  expect(frame.props.borderStyle).toBe('dashed')
  expect(frame.props.borderColor).toBe('#00c8ff')
  expect(frame.props.marginTop).toBe(1)
  // the bullet, the text around the table as the engine's markdown
  expect(nodes.some(n => n.type === 'Text' && textOf(n) === '●')).toBe(true)
  expect(nodes.filter(n => n.type === 'Markdown').map(n => n.props.text)).toEqual(['Intro line.', '`one`', 'Outro.'])
  // the grid: corners, junctions, and a bold header
  const texts = nodes.filter(n => n.type === 'Text').map(textOf)
  for (const glyph of ['┌', '┬', '┐', '├', '┼', '┤', '└', '┴', '┘']) expect(texts).toContain(glyph)
  expect(nodes.find(n => n.type === 'Text' && textOf(n) === 'Key')?.props.bold).toBe(true)
  // every column as wide as its widest cell, shrinking with the frame; the lines too
  const columns = nodes.filter(n => n.type === 'Box' && n.props.flexShrink === 1 && typeof n.props.width === 'number')
  expect([...new Set(columns.map(n => n.props.width))]).toEqual([14, 7, 20])
  // the alignment of the delimiter row; an escaped pipe kept in its cell, a missing cell left empty
  expect(columns.filter(n => n.props.paddingX === 1).map(n => n.props.alignItems).slice(0, 3)).toEqual(['flex-start', 'center', 'flex-end'])
  expect(texts).toContain('beta | gamma')
  // the vertical lines: absolute columns of │ clipped to their row
  const bar = nodes.find(n => n.type === 'Box' && n.props.position === 'absolute')
  expect(bar?.props).toMatchObject({ top: 0, bottom: 0, overflow: 'hidden' })
  await ui.unmount()
})

test("a table in a code fence, a summary, or another surface is left to the engine's drawing", async ($, on) => {
  world(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{'● ' + (e.props as { text: string }).text}</Text>
  })

  await $.session.start(start)

  const fenced = '```\n| a | b |\n| - | - |\n```'
  const cases = [
    { surface: 'terminal', props: { text: fenced, isFirstOfReply: true } },
    { surface: 'terminal', props: { text: TABLE, isFirstOfReply: true, isSummary: true } },
    ...(['desktop', 'vscode', 'mobile'] as const).map(surface => ({ surface, props: { text: TABLE, isFirstOfReply: true } })),
  ] as const
  for (const { surface, props } of cases) {
    const ui = await $.ui.mount({ ...BLOCK, surface, props })
    expect((await ui.find({ type: 'Text', text: /^● / }))?.text).toBe('● ' + props.text)
    await ui.unmount()
  }
})
