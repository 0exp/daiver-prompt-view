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
