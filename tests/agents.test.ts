import { expect, test } from 'claude-code/testing'
import { start, world } from './world'

// the line as agent-count's default colors drew it, byte for byte
const IDLE =
  '\x1b[38;2;128;128;128m⚙ \x1b[1mmain\x1b[22m:\x1b[38;2;255;255;255midle\x1b[38;2;128;128;128m │ \x1b[1magents\x1b[22m:0 ' +
  '(\x1b[38;2;135;206;250m\x1b[1msub\x1b[22m\x1b[38;2;128;128;128m:0 \x1b[38;2;175;238;238m\x1b[1msh\x1b[22m\x1b[38;2;128;128;128m:0 ' +
  '\x1b[38;2;255;160;160m\x1b[1mmon\x1b[22m\x1b[38;2;128;128;128m:0) -> ' +
  '\x1b[1mpending\x1b[22m:0 \x1b[1mrunning\x1b[22m:0 \x1b[1mwaiting\x1b[22m:0 \x1b[1midle\x1b[22m:0\x1b[0m\n'

test('the agents line is written for the session in the default colors', async ($, on) => {
  const { agents } = world(on)

  await $.session.start(start)

  expect(agents()).toBe(IDLE)
})

test('a theme change draws the agents line again', async ($, on) => {
  const { agents, files } = world(on)

  await $.session.start(start)
  files.delete('/home/me/.claude/daiver-prompt-view/agents/s1')
  await $.command.run({ command: 'daiver-prompt-view:view:theme', args: 'default', origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 120 } })

  expect(agents()).toBe(IDLE)
})
