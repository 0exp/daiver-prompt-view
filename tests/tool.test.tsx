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
    expect((await ui.find({ type: 'Text', text: /Bash/ }))?.text).toBe('Bash(ls)')
    await ui.unmount()
  }
})
