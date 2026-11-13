import { expect, test } from 'claude-code/testing'
import { start, world } from './world'

const ROW = {
  plugin: 'daiver-prompt-view',
  component: 'ToolUse',
  requestId: 't1',
  props: { tool_use_id: 't1', tool: 'Bash', input: { command: 'ls' }, isRunning: false, isErrored: false, isInterrupted: false },
} as const

test("a tool call's row is framed in the theme's tool color, the engine's row inside", async ($, on) => {
  world(on)
  // the engine's own row beneath the plugin
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{(e.props as { tool: string }).tool + '(ls)'}</Text>
  })

  await $.session.start(start)

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...ROW, surface })
    const box = await ui.find({ type: 'Box' })

    expect(box?.props.borderStyle).toBe('dashed')
    expect(box?.props.borderColor).toBe('#6a34a3')
    expect(box?.props.marginTop).toBe(1)
    // the engine's own top margin pulled back inside, no blank row under the border
    expect((box?.children[0] as { props: { marginTop?: number } }).props.marginTop).toBe(-1)
    expect((await ui.find({ type: 'Text', text: /Bash/ }))?.text).toBe('Bash(ls)')
    await ui.unmount()
  }
})

// a subagent's row as the session stores it, live
const subagent = (id: string) =>
  ({
    message: { type: 'assistant', role: 'assistant', content: [{ type: 'tool_use', id, name: 'Bash', input: { command: 'ls' } }] },
    door: 'response',
    origin: { kind: 'model', model: 'claude-opus-5-5' },
    uuid: 'r-' + id,
    agentId: 'agent-1',
  }) as const

test("a subagent's tool call is drawn as the engine draws it, no frame: under a running Agent row its slot is one row tall", async ($, on) => {
  world(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{(e.props as { tool: string }).tool + '(ls)'}</Text>
  })

  await $.session.start(start)
  await $.session.append(subagent('t1'))

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...ROW, surface })

    expect(await ui.find({ type: 'Box' })).toBeUndefined()
    expect((await ui.find({ type: 'Text', text: /Bash/ }))?.text).toBe('Bash(ls)')
    await ui.unmount()
  }

  // a call on main is still framed
  const ui = await $.ui.mount({ ...ROW, requestId: 't2', props: { ...ROW.props, tool_use_id: 't2' }, surface: 'terminal' })
  expect((await ui.find({ type: 'Box' }))?.props.borderColor).toBe('#6a34a3')
  await ui.unmount()
})

test('a row the engine draws empty is left unframed, and framed again once it grows', async ($, on) => {
  world(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>row</Text>
  })

  await $.session.start(start)

  const props = { ...ROW.props, tool_use_id: 'e1' }
  const at = (of: number) => ({ ...props, onScreen: { first: 0, last: of - 1, of } })
  const isFramed = async (ui: { find: (q: { type: 'Box' }) => Promise<{ props: Record<string, unknown> } | undefined> }) =>
    (await ui.find({ type: 'Box' }))?.props.borderStyle === 'dashed'
  const ui = await $.ui.mount({ ...ROW, requestId: 'e1', props, surface: 'terminal' })

  // not measured yet: framed
  expect(await isFramed(ui)).toBe(true)
  // framed, the gap and two borders alone: the engine drew nothing, the frame goes
  await ui.redraw(at(3))
  expect(await isFramed(ui)).toBe(false)
  // bare, the engine's gap row alone or off screen: still bare
  await ui.redraw(at(1))
  expect(await isFramed(ui)).toBe(false)
  await ui.redraw({ ...props, onScreen: null })
  expect(await isFramed(ui)).toBe(false)
  // bare, a row of its own now: framed again, and a real row stays framed
  await ui.redraw(at(2))
  expect(await isFramed(ui)).toBe(true)
  await ui.redraw(at(4))
  expect(await isFramed(ui)).toBe(true)
  await ui.unmount()
})
