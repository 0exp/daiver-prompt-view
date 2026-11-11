import { expect, test } from 'claude-code/testing'
import { conf, run, start, world } from './world'

const REPLY = {
  plugin: 'daiver-prompt-view',
  component: 'AssistantMessage',
  requestId: 'a1',
  surface: 'terminal',
  props: { text: 'Done.', isFirstOfReply: true },
} as const

// every framed site of the transcript
const SITES = [
  REPLY,
  { ...REPLY, component: 'UserMessage', requestId: 'm1', props: { text: 'hi', origin: { kind: 'composer' }, isExpanded: false } },
  { ...REPLY, component: 'ToolUse', requestId: 't1', props: { tool_use_id: 't1', tool: 'Bash', input: {}, isRunning: false, isErrored: false, isInterrupted: false } },
  { ...REPLY, component: 'Spinner', requestId: 'main', props: { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' } },
  { ...REPLY, component: 'CommandOutput', requestId: 'c1', props: { command: 'cost', args: '', text: 'x', isErrored: false } },
] as const

test('show-borders toggles the option, on and off set it', async ($, on) => {
  const { sets, config } = world(on)

  await $.session.start(start)

  expect((await $.command.run(run('chat:show-borders'))).text).toBe('The frames are now hidden.')
  expect(config()).toBe(conf(true, false, 'random', 'default', true, false, false))
  expect((await $.command.run(run('chat:show-borders'))).text).toBe('The frames are now shown.')
  expect((await $.command.run(run('chat:show-borders', 'off'))).text).toBe('The frames are now hidden.')
  expect((await $.command.run(run('chat:show-borders', 'on'))).text).toBe('The frames are now shown.')
  expect(sets).toEqual(['borders=false', 'borders=true', 'borders=false', 'borders=true'])
  expect((await $.command.run(run('chat:show-borders', 'maybe'))).text).toBe('Usage: /daiver-prompt-view:chat:show-borders [on|off]')
})

test("show-chat-borders toggles the chat's own option, on and off set it", async ($, on) => {
  const { sets, config } = world(on)

  await $.session.start(start)

  expect((await $.command.run(run('chat:show-chat-borders'))).text).toBe("The chat's frames are now hidden.")
  expect(config()).toBe(conf(true, false, 'random', 'default', true, false, true, true, false))
  expect((await $.command.run(run('chat:show-chat-borders'))).text).toBe("The chat's frames are now shown.")
  expect((await $.command.run(run('chat:show-chat-borders', 'off'))).text).toBe("The chat's frames are now hidden.")
  expect((await $.command.run(run('chat:show-chat-borders', 'on'))).text).toBe("The chat's frames are now shown.")
  expect(sets).toEqual(['chatBorders=false', 'chatBorders=true', 'chatBorders=false', 'chatBorders=true'])
  expect((await $.command.run(run('chat:show-chat-borders', 'maybe'))).text).toBe('Usage: /daiver-prompt-view:chat:show-chat-borders [on|off]')
})

test("show-statusline-borders toggles the status line's own option, on and off set it", async ($, on) => {
  const { sets, config } = world(on)

  await $.session.start(start)

  expect((await $.command.run(run('chat:show-statusline-borders'))).text).toBe("The status line's frame is now hidden.")
  expect(config()).toBe(conf(true, false, 'random', 'default', true, false, true, false))
  expect((await $.command.run(run('chat:show-statusline-borders'))).text).toBe("The status line's frame is now shown.")
  expect((await $.command.run(run('chat:show-statusline-borders', 'off'))).text).toBe("The status line's frame is now hidden.")
  expect((await $.command.run(run('chat:show-statusline-borders', 'on'))).text).toBe("The status line's frame is now shown.")
  expect(sets).toEqual(['statuslineBorders=false', 'statuslineBorders=true', 'statuslineBorders=false', 'statuslineBorders=true'])
  expect((await $.command.run(run('chat:show-statusline-borders', 'maybe'))).text).toBe('Usage: /daiver-prompt-view:chat:show-statusline-borders [on|off]')
})

test('with the frames off every framed site is left to the engine', { options: { borders: false } }, async ($, on) => {
  world(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  await $.session.start(start)

  for (const target of SITES) {
    const ui = await $.ui.mount(target)

    expect(await ui.find({ type: 'Box' })).toBeUndefined()
    expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
    await ui.unmount()
  }
})

test("with the chat's frames off every framed site is left to the engine", { options: { chatBorders: false } }, async ($, on) => {
  world(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  await $.session.start(start)

  for (const target of SITES) {
    const ui = await $.ui.mount(target)

    expect(await ui.find({ type: 'Box' })).toBeUndefined()
    expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
    await ui.unmount()
  }
})

test('border-style sets the frames style, shows it with no argument', async ($, on) => {
  const { sets, config } = world(on)

  await $.session.start(start)

  expect((await $.command.run(run('chat:border-style'))).text).toBe('Frame style: dotted (one of dotted, line)')
  expect((await $.command.run(run('chat:border-style', 'line'))).text).toBe('The frames are now line.')
  expect(config()).toBe(conf(true, false, 'random', 'default', true, false, true, true, true, 'line'))
  expect((await $.command.run(run('chat:border-style', 'dotted'))).text).toBe('The frames are now dotted.')
  expect(sets).toEqual(['borderStyle=line', 'borderStyle=dotted'])
  expect((await $.command.run(run('chat:border-style', 'wavy'))).text).toBe('Usage: /daiver-prompt-view:chat:border-style [dotted|line]')
})

test('every framed site is dashed by default', async ($, on) => {
  world(on)

  await $.session.start(start)

  for (const target of SITES) {
    const ui = await $.ui.mount(target)

    expect((await ui.find({ type: 'Box' }))?.props.borderStyle).toBe('dashed')
    await ui.unmount()
  }
})

test('with the line style every framed site is a solid rounded frame', { options: { borderStyle: 'line' } }, async ($, on) => {
  world(on)

  await $.session.start(start)

  for (const target of SITES) {
    const ui = await $.ui.mount(target)

    expect((await ui.find({ type: 'Box' }))?.props.borderStyle).toBe('round')
    await ui.unmount()
  }
})
