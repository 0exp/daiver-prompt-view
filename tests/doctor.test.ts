import { expect, test } from 'claude-code/testing'
import { run, start, world } from './world'

const WIRED = { type: 'command', command: 'sh "$HOME/.claude/daiver-prompt-view/statusline.sh"', refreshInterval: 1 }

test('doctor: every hook answered, the padding applied, auto memory from the merged settings', async ($, on) => {
  const { settings } = world(on)
  settings.value = { statusLine: { ...WIRED, padding: 4 } }

  await $.session.start(start)

  expect((await $.command.run(run('mod:doctor'))).text).toBe(
    [
      'daiver-prompt-view doctor',
      'settings.read: answered by the mod (checked now): the padding option applies',
      'prompt.section: not seen yet (it runs with each turn; still none after one: a plugin above passes it by); it tells a session whose auto memory is blocked',
      'classic.Stop: not seen yet (it runs as a turn ends; still none after one: a plugin above passes it by); it drops finished shells and monitors from the agents line',
      'padding: statuslinePadding -1, drawn -1',
      'auto memory: on, from the merged settings',
    ].join('\n'),
  )
})

test('doctor: the settings read refused, auto memory from the settings files', async ($, on) => {
  const { files } = world(on, { settingsDenied: true })
  files.set('/home/me/.claude/settings.json', '{"autoMemoryEnabled":false}')

  await $.session.start(start)

  const text = (await $.command.run(run('mod:doctor'))).text

  expect(text).toContain('settings.read: refused (checked now): auto memory is read from the settings files')
  expect(text).toContain("padding: statuslinePadding -1; statusLine does not run the mod's script")
  expect(text).toContain('auto memory: off, from the settings files (the settings read was refused)')
})

test('doctor takes no argument', async ($, on) => {
  world(on)

  await $.session.start(start)

  expect((await $.command.run(run('mod:doctor', 'now'))).text).toBe('Usage: /daiver-prompt-view:mod:doctor')
})
