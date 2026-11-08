import { expect, test } from 'claude-code/testing'
import { conf, run, start, world } from './world'

const PANE = {
  plugin: 'daiver-prompt-view',
  component: 'Pane',
  requestId: 'history',
  props: { title: 'Prompts', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

const submit = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } }) as const

test('show toggles the history option, opens and closes the pane', async ($, on) => {
  const { sets, config, panes } = world(on)

  await $.session.start(start)
  expect(panes.open).toEqual([])

  expect((await $.command.run(run('history:show'))).text).toBe('The prompt history pane is now shown.')
  expect(config()).toBe(conf(true, false, 'random', 'default', true, true))
  expect(panes.open).toEqual(['history'])
  expect((await $.command.run(run('history:show', 'off'))).text).toBe('The prompt history pane is now hidden.')
  expect(panes.open).toEqual([])
  expect(panes.closed).toEqual(['history'])
  expect((await $.command.run(run('history:show', 'on'))).text).toBe('The prompt history pane is now shown.')
  expect(sets).toEqual(['history=true', 'history=false', 'history=true'])
  expect((await $.command.run(run('history:show', 'maybe'))).text).toBe('Usage: /daiver-prompt-view:history:show [on|off]')
})

test('the pane opens at the session start when the option is on', { options: { history: true } }, async ($, on) => {
  const { panes } = world(on)

  await $.session.start(start)

  expect(panes.open).toEqual(['history'])
})

test("the pane lists the session's prompts in the theme's history frame, with a × that closes it", async ($, on) => {
  const { panes } = world(on)

  await $.session.start(start)
  await $.prompt.submit(submit('first prompt'))
  await $.prompt.submit(submit('second\nline two'))
  await $.prompt.submit({ ...submit('/cost'), command: { name: 'cost', args: '' } })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const frame = await ui.find({ type: 'Box' })

    expect(frame?.props.borderStyle).toBe('round')
    expect(frame?.props.borderColor).toBe('#d77757')
    expect((await ui.find({ type: 'Text', text: /Prompts/ }))?.text).toBe('Prompts (2)')
    expect((await ui.find({ type: 'Text', text: /first/ }))?.text).toBe('  1 first prompt')
    expect((await ui.find({ type: 'Text', text: /second/ }))?.text).toBe('  2 second')
    expect(await ui.find({ type: 'Text', text: /cost/ })).toBeUndefined()
    expect((await ui.find({ key: 'close' }))?.props.label).toBe('×')
    await ui.unmount()
  }

  await (await $.ui.mount({ ...PANE, surface: 'terminal' })).press({ key: 'close' })
  expect(panes.closed).toEqual(['history'])
})

test('an empty pane says so', async ($, on) => {
  world(on)

  await $.session.start(start)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })

  expect((await ui.find({ type: 'Text', text: /No prompts/ }))?.text).toBe('No prompts yet.')
  await ui.unmount()
})
