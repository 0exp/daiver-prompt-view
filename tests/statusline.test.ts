import { expect, test } from 'claude-code/testing'
import { loadConfig } from '../hooks/shared/config'
import { withPadding } from '../hooks/features/statusline'
import { conf, DIR, start, world } from './world'

const THEME_SH =
  "# daiver-prompt-view theme: default\nc_gray='38;2;128;128;128'\nc_white='38;2;255;255;255'\nc_orange='38;2;215;119;87'\n" +
  "c_session='38;2;255;250;250'\nc_ctx='38;2;255;0;255'\nc_lmt='38;2;135;206;235'\nc_rst='38;2;144;238;144'\n" +
  "c_pch='38;2;132;136;132'\nc_sha='38;2;212;201;106'\nc_branch='1;38;2;170;127;240'\nc_flags='1;38;2;239;100;124'\nc_added='38;2;144;238;144'\nc_removed='38;2;239;100;124'\nc_matrix='38;2;215;119;87'\nc_frame='38;2;215;119;87'\nc_effort='38;2;215;119;87'\nc_ostyle='38;2;230;200;110'\n"

test('the session start installs the script, its config and the default theme', async ($, on) => {
  const { files, config } = world(on)

  await $.session.start(start)

  expect(files.get(`${DIR}/statusline.sh`)).toBe('#!/bin/sh\n')
  expect(config()).toBe(conf(true, false, 'random'))
  // the palette the status line had before themes, byte for byte
  expect(files.get(`${DIR}/theme.sh`)).toBe(THEME_SH)
})

test('the options reach the config file', { options: { clodik: false, clodikAnimate: true, clodikAnimation: 'pixels' } }, async ($, on) => {
  const { config } = world(on)

  await $.session.start(start)

  expect(config()).toBe(conf(false, true, 'pixels'))
})


// the user's statusLine as settings.json holds it, beneath the plugin
const WIRED = { type: 'command', command: 'sh "$HOME/.claude/daiver-prompt-view/statusline.sh"', refreshInterval: 1 }

test('statuslinePadding reaches the config file, -1 by default', async ($, on) => {
  const { config } = world(on)

  await $.session.start(start)

  expect(config()).toContain('\npadding=-1\n')
})

test('a statuslinePadding value reaches the config file', { options: { statuslinePadding: 2 } }, async ($, on) => {
  const { config } = world(on)

  await $.session.start(start)

  expect(config()).toContain('\npadding=2\n')
})

test("the merged settings carry statusLine.padding from the option while statusLine runs the mod's script", async () => {
  loadConfig({})
  expect(withPadding({ statusLine: { ...WIRED, padding: 4 }, model: 'opus' })).toEqual({ statusLine: { ...WIRED, padding: -1 }, model: 'opus' })
  loadConfig({ statuslinePadding: 3 })
  expect(withPadding({ statusLine: WIRED })).toEqual({ statusLine: { ...WIRED, padding: 3 } })
  // out of range or not a whole number: the default
  loadConfig({ statuslinePadding: -5 })
  expect(withPadding({ statusLine: WIRED })).toEqual({ statusLine: { ...WIRED, padding: -1 } })
  loadConfig({ statuslinePadding: 1.5 })
  expect(withPadding({ statusLine: WIRED })).toEqual({ statusLine: { ...WIRED, padding: -1 } })
})

test('another status line, or none, is left as it is', async () => {
  loadConfig({ statuslinePadding: 3 })
  const other = { statusLine: { type: 'command', command: 'ccstatus', padding: 2 } }

  expect(withPadding(other)).toBe(other)
  expect(withPadding({ model: 'opus' })).toEqual({ model: 'opus' })
  loadConfig({})
})
