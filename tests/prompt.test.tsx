import { expect, test } from 'claude-code/testing'
import { start, world } from './world'

const ROW = {
  plugin: 'daiver-prompt-view',
  component: 'UserMessage',
  requestId: 'm1',
  props: { text: 'hello', origin: { kind: 'composer' }, isExpanded: false },
} as const

test("the person's prompt is framed in the theme's prompt color, on every surface", async ($, on) => {
  world(on)
  // the engine's own row beneath the plugin
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{'> ' + (e.props as { text: string }).text}</Text>
  })

  await $.session.start(start)

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...ROW, surface })
    const box = await ui.find({ type: 'Box' })

    expect(box?.props.borderStyle).toBe('round')
    expect(box?.props.borderColor).toBe('#d77757')
    expect((await ui.find({ type: 'Text', text: /hello/ }))?.text).toBe('> hello')
    await ui.unmount()
  }
})

test('a notification row is left to the engine', async ($, on) => {
  world(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  await $.session.start(start)

  const ui = await $.ui.mount({ ...ROW, surface: 'terminal', props: { ...ROW.props, origin: { kind: 'task-notification' } } })

  expect(await ui.find({ type: 'Box' })).toBeUndefined()
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()
})
