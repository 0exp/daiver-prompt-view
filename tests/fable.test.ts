import { expect, test } from 'claude-code/testing'
import { fableLine, fableOf } from '../hooks/features/fable'
import { DIR, start, world } from './world'

const FABLE = { kind: 'weekly_scoped', group: 'weekly', percent: 23.4, resets_at: '2026-11-27T00:00:00.000Z', scope: { model: { display_name: 'Fable' } } }
const USAGE = { five_hour: { utilization: 43 }, seven_day: { utilization: 12 }, limits: [{ kind: 'weekly_all', group: 'weekly', percent: 12 }, FABLE] }

test("the Fable row of the plan's usage: its percentage and reset; none without Fable access", () => {
  expect(fableOf(USAGE)).toEqual({ pct: 23.4, resetsAt: Date.parse('2026-11-27T00:00:00.000Z') / 1000 })
  expect(fableOf({ limits: [{ ...FABLE, resets_at: 1800000000 }] })).toEqual({ pct: 23.4, resetsAt: 1800000000 })
  expect(fableOf({ limits: [{ ...FABLE, scope: { model: { display_name: 'Opus' } } }] })).toBe(null)
  expect(fableOf({ five_hour: { utilization: 43 } })).toBe(null)
  expect(fableOf(null)).toBe(null)
  expect(fableLine(fableOf(USAGE), 100)).toBe(`23.4 ${Date.parse('2026-11-27T00:00:00.000Z') / 1000} 100\n`)
  expect(fableLine(null, 100)).toBe('- - 100\n')
})

test('the session start writes the Fable limit to the shared file, with the session credential', async ($, on) => {
  const { files, clock, auth } = world(on)
  const asked: { url: string; auth: unknown }[] = []

  clock.now = 1000_000
  auth.value = { handle: 'h1', kind: 'bearer' }
  on('http.fetch', ($, e) => {
    asked.push({ url: e.url, auth: e.init?.auth })
    return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify(USAGE) } }
  })

  await $.session.start(start)
  await new Promise(resolve => setTimeout(resolve, 10))

  expect(asked).toEqual([{ url: 'https://api.anthropic.com/api/oauth/usage?skip_spend=1', auth: 'h1' }])
  expect(files.get(`${DIR}/fable`)).toBe(`23.4 ${Date.parse('2026-11-27T00:00:00.000Z') / 1000} 1000\n`)
})

test('no Fable window: the file says so and the status line leaves it out; a fresh file is not asked again', async ($, on) => {
  const { files, clock, auth } = world(on)
  let asks = 0

  clock.now = 1000_000
  auth.value = { handle: 'h1', kind: 'bearer' }
  on('http.fetch', () => {
    asks++
    return { value: { status: 200, ok: true, headers: {}, text: JSON.stringify({ limits: [] }) } }
  })

  await $.session.start(start)
  await new Promise(resolve => setTimeout(resolve, 10))
  expect(files.get(`${DIR}/fable`)).toBe('- - 1000\n')

  await $.session.start(start)
  await new Promise(resolve => setTimeout(resolve, 10))
  expect(asks).toBe(1)
})
