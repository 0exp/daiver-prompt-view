import { expect, test } from 'claude-code/testing'
import { conf, run, start, world } from './world'

test('theme sets the option for the whole status line, shows it with no argument', async ($, on) => {
  const { sets, config } = world(on)

  await $.session.start(start)

  expect((await $.command.run(run('view:theme'))).text).toBe('Status line theme: default (one of default)')
  expect((await $.command.run(run('view:theme', 'default'))).text).toBe('The status line now uses the default theme.')
  expect(sets).toEqual(['theme=default'])
  expect(config()).toBe(conf(true, false, 'matrix'))
  expect((await $.command.run(run('view:theme', 'neon'))).text).toBe('Usage: /daiver-prompt-view:view:theme [default]')
})
