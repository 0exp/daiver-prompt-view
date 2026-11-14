import { expect, test } from 'claude-code/testing'
import { conf, run, start, world } from './world'

test('animate toggles the option, on and off set it', async ($, on) => {
  const { sets, config } = world(on)

  await $.session.start(start)

  expect((await $.command.run(run('clodik:animate'))).text).toBe('Clawd now animates all the time.')
  expect(config()).toBe(conf(true, true, 'matrix'))
  await $.command.run(run('clodik:animate', 'off'))
  expect(config()).toBe(conf(true, false, 'matrix'))
  await $.command.run(run('clodik:animate', 'on'))
  expect(sets).toEqual(['clodikAnimate=true', 'clodikAnimate=false', 'clodikAnimate=true'])
  expect((await $.command.run(run('clodik:animate', 'maybe'))).text).toBe('Usage: /daiver-prompt-view:clodik:animate [on|off]')
})

test('animation sets the option, shows it with no argument', async ($, on) => {
  const { sets, config } = world(on)

  await $.session.start(start)

  expect((await $.command.run(run('clodik:animation'))).text).toContain("Clawd's animation: matrix")
  expect((await $.command.run(run('clodik:animation', 'spin'))).text).toBe('Clawd now plays spin.')
  expect(config()).toBe(conf(true, false, 'spin'))
  await $.command.run(run('clodik:animation', 'random'))
  expect(sets).toEqual(['clodikAnimation=spin', 'clodikAnimation=random'])
  expect((await $.command.run(run('clodik:animation', 'moonwalk'))).text).toContain('Usage: /daiver-prompt-view:clodik:animation [random|jump|')
})
