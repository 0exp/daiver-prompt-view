import { expect, test } from 'claude-code/testing'
import { frameStyle, hoverStyle, loadConfig } from '../hooks/shared/config'
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
  expect(config()).toBe(conf(true, false, 'random', 'default', true))
  expect(panes.open).toEqual(['history'])
  expect(panes.background).toBe('#101016')
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
    expect((await ui.find({ type: 'Text', text: /History/ }))?.text).toBe('History (3)')
    expect((await ui.find({ type: 'Text', text: hms(3600000) }))?.text).toBe(hms(3600000))
    expect((await ui.find({ type: 'Button', text: /logged/ }))?.text).toBe('logged before the mod')
    expect((await ui.find({ type: 'Button', text: /first/ }))?.text).toBe('first prompt')
    expect((await ui.find({ type: 'Button', text: /second/ }))?.text).toBe('second\nline two')
    expect(await ui.find({ type: 'Button', text: /cost/ })).toBeUndefined()
    expect(await ui.find({ type: 'Button', text: /another/ })).toBeUndefined()
    expect((await ui.find({ key: 'close' }))?.props.label).toBe('×')
    await ui.unmount()
  }

  await (await $.ui.mount({ ...PANE, surface: 'terminal' })).press({ key: 'close' })
  expect(panes.closed).toEqual(['history'])
})

// every message is a press that scrolls the transcript to the prompt's row
// ($.ui.scroll, which the test engine does not answer: the real one does); a
// prompt whose row the transcript has not drawn says so in a toast
test('every message is a press; one whose row is nowhere to be found is noted in the debug log, no toast', async ($, on) => {
  const { files, toasts, logs } = world(on)
  // the session's transcript holds the first prompt's row
  files.set('/home/me/.claude/projects/-home-me-proj/s1.jsonl', '{"type":"user","uuid":"u1","message":{"role":"user","content":"find me"}}\n{"type":"user","isMeta":true,"uuid":"u2","message":{"role":"user","content":"gone"}}\n')

  await $.session.start(start)
  await $.prompt.submit(submit('find me'))
  await $.prompt.submit(submit('gone'))

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const buttons = (await ui.findAll({ type: 'Button' })).filter(one => one.key !== 'close')

  // newest first
  expect(buttons.map(one => one.text)).toEqual(['gone', 'find me'])
  expect(buttons.map(one => one.props.plain)).toEqual([true, true])
  // each message is a keyed Box (a hover scope: the frame's hover color is the surface's to apply)
  expect((await ui.findAll({ type: 'Box' })).filter(one => one.key?.startsWith('m')).length).toBe(2)
  await ui.press({ key: buttons[0]!.key! })
  expect(toasts).toEqual([])
  expect(logs).toEqual(['history: the prompt has no transcript row to scroll to'])
  await ui.unmount()
})

test('the pane scrolls by messages under its header: the ones scrolled past are left out', async ($, on) => {
  const { state } = world(on)

  await $.session.start(start)
  await $.prompt.submit(submit('older'))
  await $.prompt.submit(submit('newer'))
  // the person's wheel moved the list one message down (the ui.scroll hook's doing)
  state.set('daiver-prompt-view.skip', { value: 1, version: 1 })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const buttons = (await ui.findAll({ type: 'Button' })).filter(one => one.key !== 'close')

  expect(buttons.map(one => one.text)).toEqual(['older'])
  expect((await ui.find({ type: 'Text', text: /History/ }))?.text).toBe('History (2) ↑1')
  await ui.unmount()
})

test('with no /config row the change holds for the session, noted in the debug log, no toast of its own', async ($, on) => {
  // another plugin above filters this mod's rows out of the list
  const { toasts, logs, config, sets } = world(on, { configRows: false })

  await $.session.start(start)

  expect((await $.command.run(run('history:show', 'on'))).text).toBe('The prompt history pane is now shown.')
  expect(config()).toBe(conf(true, false, 'random', 'default', true))
  expect(sets).toEqual([])
  // the command's own /-Command complete alone (toasts.ts)
  expect(toasts).toEqual(['/-Command complete'])
  expect(logs).toEqual(['the history option has no /config row to save to; the change holds for this session'])
})

test('the scrollbar stands at the list\'s right edge, its thumb where the list is', async ($, on) => {
  const { state } = world(on)

  await $.session.start(start)
  for (const n of [1, 2, 3, 4, 5]) await $.prompt.submit(submit(`prompt ${n}`))
  state.set('daiver-prompt-view.skip', { value: 4, version: 1 })

  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const cells = (await ui.findAll({ type: 'Text' })).filter(one => one.text === '┃' || one.text === '│')

  // bodyRows 20: an 18-row track; 4 of 5 messages fit, so the thumb is 14 rows, at the end for the oldest
  expect(cells.length).toBe(18)
  expect(cells.map(one => one.text).join('')).toBe('│'.repeat(4) + '┃'.repeat(14))
  await ui.unmount()
})

test("an empty pane says so, in the theme's history frame", async ($, on) => {
  world(on)

  await $.session.start(start)
  const ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const body = await ui.find({ type: 'Box' })

  expect(body?.props.borderStyle).toBe('dashed')
  expect(body?.props.borderColor).toBe('#d77757')
  expect((await ui.find({ type: 'Text', text: /No messages/ }))?.text).toBe('No messages yet.')
  await ui.unmount()
})

// Claude's rows: one in the transcript before the mod loaded (a text and a tool
// call), one a subagent's (left out), and the prompt that opened them
const STORY =
  '{"type":"user","uuid":"u1","timestamp":"1970-01-01T01:00:00.000Z","message":{"role":"user","content":"look around"}}\n' +
  '{"type":"assistant","uuid":"r1","timestamp":"1970-01-01T01:00:01.000Z","message":{"role":"assistant","content":[{"type":"thinking","thinking":"hm"},{"type":"text","text":"Looking."},{"type":"tool_use","id":"t1","name":"Bash","input":{"command":"ls -la\\necho done"}}]}}\n' +
  '{"type":"assistant","uuid":"r2","isSidechain":true,"timestamp":"1970-01-01T01:00:02.000Z","message":{"role":"assistant","content":[{"type":"text","text":"a subagent"}]}}\n'
const LOOK = '{"display":"look around","timestamp":3600000,"sessionId":"s1"}\n'

// Claude's row as the session stores it, live
const response = (uuid: string, content: { type: string; [field: string]: unknown }[], agentId?: string) =>
  ({ message: { type: 'assistant', role: 'assistant', content }, door: 'response', origin: { kind: 'model', model: 'claude-opus-5-5' }, uuid, ...(agentId ? { agentId } : {}) }) as const

const messages = async (ui: { findAll: (q: { type: string }) => Promise<{ key?: string; text?: string; props: Record<string, unknown> }[]> }) =>
  (await ui.findAll({ type: 'Box' })).filter(one => one.key?.startsWith('m'))

test("the whole story: prompts pushed to the right in the prompt color, answers to the left in the reply and tool colors", async ($, on) => {
  const { files, clock } = world(on)
  files.set('/home/me/.claude/history.jsonl', LOOK)
  files.set('/home/me/.claude/projects/-home-me-proj/s1.jsonl', STORY)

  await $.session.start(start)
  clock.now = 3610000
  // a live answer on main, and one of a subagent (left out)
  await $.session.append(response('r3', [{ type: 'text', text: 'All done.' }, { type: 'tool_use', id: 't2', name: 'Read', input: { file_path: '/src/a.ts' } }]))
  await $.session.append(response('r4', [{ type: 'text', text: 'from a subagent' }], 'agent-1'))

  for (const surface of ['terminal', 'desktop', 'vscode', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...PANE, surface })
    const boxes = await messages(ui)
    const buttons = (await ui.findAll({ type: 'Button' })).filter(one => one.key !== 'close')

    expect((await ui.find({ type: 'Text', text: /History/ }))?.text).toBe('History (5)')
    // newest first
    expect(buttons.map(one => one.text)).toEqual(['Read(/src/a.ts)', 'All done.', 'Bash(ls -la)', 'Looking.', 'look around'])
    expect(boxes.map(one => one.props.borderColor)).toEqual(['#6a34a3', '#00c8ff', '#6a34a3', '#00c8ff', '#d77757'])
    expect(boxes.map(one => [one.props.marginLeft, one.props.marginRight])).toEqual([
      [undefined, 8],
      [undefined, 8],
      [undefined, 8],
      [undefined, 8],
      [8, undefined],
    ])
    await ui.unmount()
  }
})

test('questions lists the prompts alone, answers the answers alone, each at the full width', async ($, on) => {
  const { files } = world(on)
  files.set('/home/me/.claude/history.jsonl', LOOK)
  files.set('/home/me/.claude/projects/-home-me-proj/s1.jsonl', STORY)

  await $.session.start(start)

  expect((await $.command.run(run('history:mode', 'questions'))).text).toBe('The history pane now lists your prompts alone.')
  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /Prompts/ }))?.text).toBe('Prompts (1)')
  expect((await messages(ui)).map(one => [one.props.marginLeft, one.props.marginRight, one.text])).toEqual([[undefined, undefined, `${hms(3600000)}look around`]])
  await ui.unmount()

  expect((await $.command.run(run('history:mode', 'answers'))).text).toBe("The history pane now lists Claude's answers alone.")
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /Answers/ }))?.text).toBe('Answers (2)')
  expect((await messages(ui)).map(one => [one.props.marginLeft, one.props.marginRight])).toEqual([
    [undefined, undefined],
    [undefined, undefined],
  ])
  await ui.unmount()
})

test('a long answer shows its first lines; an empty answers pane says so', { options: { historyMode: 'answers' } }, async ($, on) => {
  world(on)

  await $.session.start(start)
  let ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  expect((await ui.find({ type: 'Text', text: /No answers/ }))?.text).toBe('No answers yet.')
  await ui.unmount()

  const long = Array.from({ length: 12 }, (_, n) => `line ${n + 1}`).join('\n')
  await $.session.append(response('r1', [{ type: 'text', text: long }, { type: 'tool_use', id: 't1', name: 'TaskList', input: {} }]))
  ui = await $.ui.mount({ ...PANE, surface: 'terminal' })
  const buttons = (await ui.findAll({ type: 'Button' })).filter(one => one.key !== 'close')

  expect(buttons.map(one => one.text)).toEqual(['TaskList', `${long.split('\n').slice(0, 8).join('\n')}\n…`])
  await ui.unmount()
})

test('mode sets the historyMode option, shows it with no argument', async ($, on) => {
  const { sets } = world(on)

  await $.session.start(start)

  expect((await $.command.run(run('history:mode'))).text).toBe('The history pane lists: fullstory (one of fullstory, questions, answers)')
  expect((await $.command.run(run('history:mode', 'answers'))).text).toBe("The history pane now lists Claude's answers alone.")
  expect((await $.command.run(run('history:mode', 'fullstory'))).text).toBe("The history pane now lists your prompts and Claude's answers.")
  expect((await $.command.run(run('history:mode', 'everything'))).text).toBe('Usage: /daiver-prompt-view:history:mode [fullstory|questions|answers]')
  expect(sets).toEqual(['historyMode=answers', 'historyMode=fullstory'])
})

// the kit's drawing leaves hover styles out, so the style under the pointer is pinned on hoverStyle:
// the other one of the frames' (dashed over solid, solid over dashed)
test('the message under the pointer takes the other frame style', async () => {
  loadConfig({})
  expect([frameStyle(), hoverStyle()]).toEqual(['dashed', 'round'])
  loadConfig({ borderStyle: 'line' })
  expect([frameStyle(), hoverStyle()]).toEqual(['round', 'dashed'])
  loadConfig({})
})
