import { expect, test } from 'claude-code/testing'
import { conf, run, start, world } from './world'

const REPLY = {
  plugin: 'daiver-prompt-view',
  component: 'AssistantMessage',
  requestId: 'a1',
  surface: 'terminal',
  props: { text: 'Done.', isFirstOfReply: true },
} as const

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

test('with the frames off every framed site is left to the engine', { options: { borders: false } }, async ($, on) => {
  world(on)
  on('ui.render', ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>engine</Text>
  })

  await $.session.start(start)

  for (const target of [
    REPLY,
    { ...REPLY, component: 'UserMessage', requestId: 'm1', props: { text: 'hi', origin: { kind: 'composer' }, isExpanded: false } },
    { ...REPLY, component: 'ToolUse', requestId: 't1', props: { tool_use_id: 't1', tool: 'Bash', input: {}, isRunning: false, isErrored: false, isInterrupted: false } },
    { ...REPLY, component: 'Spinner', requestId: 'main', props: { word: 'Sauteing', message: null, suffix: '…', mode: 'thinking' } },
    { ...REPLY, component: 'CommandOutput', requestId: 'c1', props: { command: 'cost', args: '', text: 'x', isErrored: false } },
  ] as const) {
    const ui = await $.ui.mount(target)

    expect(await ui.find({ type: 'Box' })).toBeUndefined()
    expect((await ui.find({ type: 'Text' }))?.text).toBe('engine')
    await ui.unmount()
  }
})
