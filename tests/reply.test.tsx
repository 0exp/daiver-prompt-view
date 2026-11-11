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
