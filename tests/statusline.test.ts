import { expect, test } from 'claude-code/testing'
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

