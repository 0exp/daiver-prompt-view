import { expect, test } from 'claude-code/testing'
import { conf, run, start, world } from './world'

const BAND = {
  plugin: 'daiver-prompt-view',
  component: 'AbovePrompt',
  requestId: 'band',
  surface: 'terminal',
  props: { hasSurvey: false, isCollapsed: false, isWorking: false, maxRows: 10, bodyColumns: 115, scroll: { offset: 0, bodyRows: 10 }, view: {} },
} as const

test('the row shows the borders and the history switches where they stand', async ($, on) => {
  world(on)
  await $.session.start(start)

  const ui = await $.ui.mount(BAND)

  expect((await ui.find({ key: 'borders' }))?.props.label).toBe('▣ borders: on')
  expect((await ui.find({ key: 'history' }))?.props.label).toBe('≡ history: off')
  expect((await ui.find({ key: 'borders' }))?.props.hotkey).toBe('b')
  expect((await ui.find({ key: 'history' }))?.props.hotkey).toBe('h')
  expect((await ui.find({ type: 'Text', text: '▣ borders: on' }))?.props.color).toBe('#808080')
  expect((await ui.find({ key: 'borders' }))?.props.dimColor).toBe(true)
  expect((await ui.find({ key: 'history' }))?.props.dimColor).toBe(true)
  expect((await ui.find({ type: 'Text', text: '≡ history: off' }))?.props.color).toBe('#808080')
  await ui.unmount()
})

test('a press on borders turns the borders option, as show-borders does', async ($, on) => {
  const { sets, config } = world(on)
  await $.session.start(start)

  const ui = await $.ui.mount(BAND)

  await ui.press({ key: 'borders' })
  expect(sets).toEqual(['borders=false'])
  expect(config()).toBe(conf(true, false, 'matrix', 'default', false, false))
  await ui.unmount()

  const again = await $.ui.mount(BAND)

  expect((await again.find({ key: 'borders' }))?.props.label).toBe('▣ borders: off')
  await again.press({ key: 'borders' })
  expect(sets).toEqual(['borders=false', 'borders=true'])
  await again.unmount()
})

test('a press on history opens the pane and a second one closes it', async ($, on) => {
  const { sets, panes } = world(on)
  await $.session.start(start)

  const ui = await $.ui.mount(BAND)

  await ui.press({ key: 'history' })
  expect(panes.open).toEqual(['history'])
  await ui.unmount()

  const again = await $.ui.mount(BAND)

  expect((await again.find({ key: 'history' }))?.props.label).toBe('≡ history: on')
  await again.press({ key: 'history' })
  expect(panes.open).toEqual([])
  expect(sets).toEqual(['history=true', 'history=false'])
  await again.unmount()
})

test('show-buttons toggles the row, on and off set it', async ($, on) => {
  const { sets } = world(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })
  await $.session.start(start)

  expect((await $.command.run(run('chat:show-buttons'))).text).toBe('The buttons row is now hidden.')

  const ui = await $.ui.mount(BAND)

  expect(await ui.find({ key: 'borders' })).toBeUndefined()
  expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
  await ui.unmount()

  expect((await $.command.run(run('chat:show-buttons'))).text).toBe('The buttons row is now shown.')
  expect((await $.command.run(run('chat:show-buttons', 'off'))).text).toBe('The buttons row is now hidden.')
  expect((await $.command.run(run('chat:show-buttons', 'on'))).text).toBe('The buttons row is now shown.')
  expect(sets).toEqual(['buttons=false', 'buttons=true', 'buttons=false', 'buttons=true'])
  expect((await $.command.run(run('chat:show-buttons', 'maybe'))).text).toBe('Usage: /daiver-prompt-view:chat:show-buttons [on|off]')
})

test('the row yields to a survey', async ($, on) => {
  world(on)
  await $.session.start(start)

  const ui = await $.ui.mount({ ...BAND, props: { ...BAND.props, hasSurvey: true } })

  expect(await ui.find({ key: 'borders' })).toBeUndefined()
  await ui.unmount()
})

test("the doctor tells whether the row reached the band's list", async ($, on) => {
  world(on)
  await $.session.start(start)

  const ui = await $.ui.mount(BAND)
  await ui.unmount()
  expect((await $.command.run(run('mod:doctor'))).text).toContain("buttons row: drawn 1 time, in the band's list 1 of 1 time; the band open, 10 rows")

  await $.command.run(run('chat:show-buttons', 'off'))
  expect((await $.command.run(run('mod:doctor'))).text).toContain('buttons row: off (the buttons option)')
})

test("the row is framed in the theme's buttonsFrame color while the frames are on", async ($, on) => {
  world(on)
  await $.session.start(start)

  const ui = await $.ui.mount(BAND)
  expect((await ui.find({ type: 'Box' }))?.props).toMatchObject({ borderStyle: 'dashed', borderColor: '#963c3c', paddingX: 1 })
  await ui.press({ key: 'borders' })
  await ui.unmount()

  const bare = await $.ui.mount(BAND)
  expect((await bare.find({ type: 'Box' }))?.props.borderStyle).toBeUndefined()
  await bare.unmount()
})
