import { expect, test } from 'claude-code/testing'
import { start, world } from './world'

const LINE = {
  plugin: 'daiver-prompt-view',
  component: 'Spinner',
  requestId: 'main',
  props: { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' },
} as const

test("the spinner is framed in the theme's spinner color, the engine's line inside", async ($, on) => {
  world(on)
  // the engine's own line beneath the plugin
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{(e.props as { word: string }).word + '…'}</Text>
  })

  await $.session.start(start)

  for (const surface of ['terminal', 'desktop', 'vscode'] as const) {
    const ui = await $.ui.mount({ ...LINE, surface })
    const box = await ui.find({ type: 'Box' })

    expect(box?.props.borderStyle).toBe('round')
    expect(box?.props.borderColor).toBe('#bfff00')
    expect((await ui.find({ type: 'Text', text: /Sauteing/ }))?.text).toBe('Sauteing…')
    await ui.unmount()
  }
})
