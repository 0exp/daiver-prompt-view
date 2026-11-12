import { expect, test } from 'claude-code/testing'
import { run, start, world } from './world'

const turn = (fields: Record<string, unknown> = {}) =>
  ({ answer: 'Done.', durationMs: 1200, isAborted: false, turnId: 't1', reason: 'answer', ...fields }) as const

test("Claude's answer on the main loop raises Task complete; an interrupted, failed or subagent's turn none", { options: { toasts: true } }, async ($, on) => {
  const { toasts } = world(on)
  on('turn.complete', () => ({ text: '' }))

  await $.session.start(start)
  await $.turn.complete(turn({ reason: 'aborted', isAborted: true }))
  await $.turn.complete(turn({ reason: 'error' }))
  await $.turn.complete(turn({ agentId: 'agent-1' }))
  expect(toasts).toEqual([])

  await $.turn.complete(turn())
  expect(toasts).toEqual(['Task complete'])
})

test("a command the person ran raises /-Command complete, this mod's own and another's alike; a plugin's run none", { options: { toasts: true } }, async ($, on) => {
  const { toasts } = world(on)
  on('command.run', () => ({ text: 'Total cost: $0.00' }))

  await $.session.start(start)
  await $.command.run({ ...run('history:mode'), command: 'cost', origin: { kind: 'plugin', name: 'other' } })
  expect(toasts).toEqual([])

  await $.command.run({ ...run('history:mode'), command: 'cost' })
  expect((await $.command.run(run('history:mode'))).text).toBe('The history pane lists: fullstory (one of fullstory, questions, answers)')
  expect(toasts).toEqual(['/-Command complete', '/-Command complete'])
})

test('toasts:show toggles the toasts option; off raises none', { options: { toasts: true } }, async ($, on) => {
  const { toasts, sets } = world(on)
  on('turn.complete', () => ({ text: '' }))

  await $.session.start(start)

  expect((await $.command.run(run('toasts:show', 'off'))).text).toBe('The toasts are now hidden.')
  await $.turn.complete(turn())
  expect(toasts).toEqual([])
  expect((await $.command.run(run('toasts:show'))).text).toBe('The toasts are now shown.')
  expect((await $.command.run(run('toasts:show', 'maybe'))).text).toBe('Usage: /daiver-prompt-view:toasts:show [on|off]')
  expect(sets).toEqual(['toasts=false', 'toasts=true'])
  // the two commands that ran with the toasts on (the first turned them off before it ended)
  expect(toasts).toEqual(['/-Command complete', '/-Command complete'])
})

test('the toasts are off by default: no toast for a turn or a command', async ($, on) => {
  const { toasts } = world(on)
  on('turn.complete', () => ({ text: '' }))
  on('command.run', () => ({ text: 'Total cost: $0.00' }))

  await $.session.start(start)
  await $.turn.complete(turn())
  await $.command.run({ ...run('history:mode'), command: 'cost' })

  expect(toasts).toEqual([])
})

