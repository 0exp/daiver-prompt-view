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
      "skipped by: no plugin, as Claude Code's notices in this session's transcript say",
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

// Claude Code's notices in the session's transcript name the plugin that sends
// the mod's hooks on past it; another plugin's notices are not the mod's
test('doctor: the plugin that skips the hooks, from the notices in the transcript', async ($, on) => {
  const { files } = world(on, { settingsDenied: true })
  const notice = (plugin: string, hook: string, by: string) =>
    JSON.stringify({ type: 'system', subtype: 'informational', level: 'notice', content: `${plugin}: its ${hook} hook was skipped. "${by}" runs first and sent the event on past it.` })
  files.set(
    '/home/me/.claude/projects/-home-me-proj/s1.jsonl',
    [
      notice('daiver-prompt-view', 'settings.read', 'sec-plugin'),
      notice('daiver-prompt-view', 'prompt.section', 'sec-plugin'),
      notice('other-mod', 'classic.Stop', 'sec-plugin'),
      notice('daiver-prompt-view', 'session.start', 'audit-plugin'),
      '{"type":"system","content":"daiver-prompt-view: its',
    ].join('\n'),
  )

  await $.session.start(start)

  const text = (await $.command.run(run('mod:doctor'))).text

  expect(text).toContain('prompt.section: skipped: "sec-plugin" runs first and sends it on past the mod; it tells a session whose auto memory is blocked')
  expect(text).toContain('classic.Stop: not seen yet')
  expect(text).toContain(
    `skipped by: "sec-plugin" (settings.read, prompt.section), "audit-plugin" (session.start), as Claude Code's notices in this session's transcript say; the mod cannot get past a plugin seated above it, whoever manages that plugin (your organization's admins for a managed one) can let these hooks through`,
  )
})

test('doctor takes no argument', async ($, on) => {
  world(on)

  await $.session.start(start)

  expect((await $.command.run(run('mod:doctor', 'now'))).text).toBe('Usage: /daiver-prompt-view:mod:doctor')
})
