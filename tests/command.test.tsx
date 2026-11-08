import { expect, test } from 'claude-code/testing'
import { start, world } from './world'

const ROW = {
  plugin: 'daiver-prompt-view',
  component: 'CommandOutput',
  requestId: 'c1',
  props: { command: 'reload-plugins', args: '', text: 'Reloaded: 1 plugin', isErrored: false },
} as const

test("a slash command's output is framed in the theme's command color, the engine's row inside", async ($, on) => {
  world(on)
  // the engine's own row beneath the plugin
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text dimColor>{(e.props as { text: string }).text}</Text>
  })

  await $.session.start(start)

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...ROW, surface })
    const box = await ui.find({ type: 'Box' })

    expect(box?.props.borderStyle).toBe('round')
    expect(box?.props.borderColor).toBe('#808080')
    expect((await ui.find({ type: 'Text', text: /Reloaded/ }))?.text).toBe('Reloaded: 1 plugin')
    await ui.unmount()
  }
})
