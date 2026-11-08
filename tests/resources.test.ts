import { expect, test } from 'claude-code/testing'
import { conf, run, start, world } from './world'

test('show toggles the resources option, on and off set it', async ($, on) => {
  const { sets, config } = world(on)

  await $.session.start(start)

  expect((await $.command.run(run('resources:show'))).text).toBe('The status line no longer shows RAM and CPU.')
  expect(config()).toBe(conf(true, false, 'random', 'default', false))
  expect((await $.command.run(run('resources:show'))).text).toBe('The status line now shows RAM and CPU.')
  expect(config()).toBe(conf(true, false, 'random', 'default', true))
  expect((await $.command.run(run('resources:show', 'off'))).text).toBe('The status line no longer shows RAM and CPU.')
  expect((await $.command.run(run('resources:show', 'on'))).text).toBe('The status line now shows RAM and CPU.')
  expect(sets).toEqual(['resources=false', 'resources=true', 'resources=false', 'resources=true'])
  expect((await $.command.run(run('resources:show', 'maybe'))).text).toBe('Usage: /daiver-prompt-view:resources:show [on|off]')
})
