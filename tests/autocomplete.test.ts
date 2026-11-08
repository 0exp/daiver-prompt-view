import { expect, test } from 'claude-code/testing'
import { start, typed, world } from './world'

test('the typeahead offers each command its values', async ($, on) => {
  world(on)

  await $.session.start(start)

  const rows = async (text: string) => (await $.prompt.autocomplete(typed(text))).suggestions

  expect(await rows('/daiver-prompt-view:view:t')).toEqual([{ text: '/daiver-prompt-view:view:theme default', description: 'current' }])
  expect(await rows('/daiver-prompt-view:view:theme d')).toEqual([{ text: 'default', description: 'current' }])
  expect(await rows('/daiver-prompt-view:clodik:animate o')).toEqual([
    { text: 'on', description: '' },
    { text: 'off', description: 'current' },
  ])
  expect((await rows('/daiver-prompt-view:clodik:animation ')).length).toBe(0)
  expect((await rows('/daiver-prompt-view:clodik:animation s')).map(row => row.text)).toEqual(['spin', 'sway', 'stretch', 'shiver'])
  expect((await rows('/daiver-prompt-view:clodik:a')).length).toBe(2 + 13)
  expect(await rows('/daiver-prompt-view:clodik:animation spin')).toEqual([])
  expect(await rows('/daiver-prompt-view:resources:s')).toEqual([
    { text: '/daiver-prompt-view:resources:show on', description: 'current' },
    { text: '/daiver-prompt-view:resources:show off', description: '' },
  ])
  expect(await rows('/daiver-prompt-view:resources:show of')).toEqual([{ text: 'off', description: '' }])
  expect(await rows('/daiver')).toEqual([])
  expect(await rows('hello /daiver-prompt-view:view:theme')).toEqual([])
})
