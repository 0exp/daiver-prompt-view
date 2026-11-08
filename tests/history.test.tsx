import { expect, test } from 'claude-code/testing'
import { conf, run, start, world } from './world'

const PANE = {
  plugin: 'daiver-prompt-view',
  component: 'Pane',
  requestId: 'history',
  props: { title: 'Prompts', isFocused: false, bodyColumns: 40, placement: 'dock', scroll: { offset: 0, bodyRows: 20 }, view: {} },
} as const

// a time as the pane draws it, in this machine's zone
const hms = (at: number) => {
  const d = new Date(at)
  return [d.getHours(), d.getMinutes(), d.getSeconds()].map(n => String(n).padStart(2, '0')).join(':')
}

const submit = (text: string) => ({ text, wait: false, origin: { kind: 'composer' } }) as const

// Claude Code's own prompt log: two rows of this session (one a command), one of another
const LOG =
  '{"display":"logged before the mod","timestamp":3600000,"sessionId":"s1"}\n' +
  '{"display":"/cost","timestamp":3601000,"sessionId":"s1"}\n' +
  '{"display":"another session","timestamp":3602000,"sessionId":"s2"}\n'

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

test("the pane lists the session's prompts with their times in the theme's history frame, with a × that closes it", async ($, on) => {
  const { files, panes } = world(on)
  files.set('/home/me/.claude/history.jsonl', LOG)

  await $.session.start(start)
  await $.prompt.submit(submit('first prompt'))
  await $.prompt.submit(submit('second\nline two'))
  await $.prompt.submit({ ...submit('/cost'), command: { name: 'cost', args: '' } })

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const body = await ui.find({ type: 'Box' })

    // with messages inside, the body has no frame of its own, each message has
    expect(body?.props.borderStyle).toBeUndefined()
    expect((await ui.find({ type: 'Text', text: /Prompts/ }))?.text).toBe('Prompts (3)')
    expect((await ui.find({ type: 'Text', text: hms(3600000) }))?.text).toBe(hms(3600000))
    expect((await ui.find({ type: 'Text', text: /logged/ }))?.text).toBe('logged before the mod')
    expect((await ui.find({ type: 'Text', text: /first/ }))?.text).toBe('first prompt')
    expect((await ui.find({ type: 'Text', text: /second/ }))?.text).toBe('second\nline two')
    expect(await ui.find({ type: 'Text', text: /cost/ })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: /another/ })).toBeUndefined()
    expect((await ui.find({ key: 'close' }))?.props.label).toBe('×')
    await ui.unmount()
  }

  await (await $.ui.mount({ ...PANE, surface: 'terminal' })).press({ key: 'close' })
  expect(panes.closed).toEqual(['history'])
})

test("an empty pane says so, in the theme's history frame", async ($, on) => {
  world(on)

  await $.session.start(start)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const body = await ui.find({ type: 'Box' })

  expect(body?.props.borderStyle).toBe('round')
  expect(body?.props.borderColor).toBe('#d77757')
  expect((await ui.find({ type: 'Text', text: /No prompts/ }))?.text).toBe('No prompts yet.')
  await ui.unmount()
})
