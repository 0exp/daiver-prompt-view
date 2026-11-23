// fable: the weekly Fable limit, which the status line's input does not carry.
// The plan's usage (what /usage shows) lists it among its weekly windows, a
// `weekly_scoped` row for the Fable model; it is asked for with the session's
// own credential, held by the engine (the plugin sees an opaque handle only),
// and written to <mod dir>/fable, shared by every session: `pct resets_at
// asked_at` (epoch seconds), or `- - asked_at` when the account has no Fable
// window, which the script then leaves out. A failed read keeps the last file
import type { EngineInterface } from 'claude-code'
import { home } from '../shared/files'

const USAGE_URL = 'https://api.anthropic.com/api/oauth/usage?skip_spend=1'
// how often a session asks, and how fresh the shared file must be for it not to
// ask at all: one read for every session open
const EVERY_MS = 3 * 60 * 1000
const FRESH_S = 150

type Row = { kind?: unknown; percent?: unknown; resets_at?: unknown; scope?: { model?: { display_name?: unknown } } }

// the Fable row of the usage's limits: its percentage and reset (epoch
// seconds), null when there is none (no access to Fable)
export function fableOf(usage: unknown): { pct: number; resetsAt: number | undefined } | null {
  const limits = (usage as { limits?: unknown } | null)?.limits

  if (!Array.isArray(limits)) return null

  const row = (limits as Row[]).find(
    limit =>
      typeof limit === 'object' &&
      limit !== null &&
      limit.kind === 'weekly_scoped' &&
      typeof limit.scope?.model?.display_name === 'string' &&
      /^fable\b/i.test(limit.scope.model.display_name),
  )

  if (row === undefined || typeof row.percent !== 'number' || !Number.isFinite(row.percent)) return null

  const at = typeof row.resets_at === 'number' ? row.resets_at : typeof row.resets_at === 'string' ? Date.parse(row.resets_at) / 1000 : NaN

  return { pct: row.percent, resetsAt: Number.isFinite(at) ? Math.floor(at) : undefined }
}

// the file's line for a reading
export const fableLine = (fable: ReturnType<typeof fableOf>, now: number) =>
  fable === null ? `- - ${now}\n` : `${Math.round(fable.pct * 10) / 10} ${fable.resetsAt ?? '-'} ${now}\n`

async function readFable($: EngineInterface) {
  const path = `${await home($)}/fable`
  const now = Math.floor((await $.clock.now()) / 1000)
  const last = (await $.fs.exists(path)) ? await $.fs.read(path) : ''
  const askedAt = Number(last.trim().split(' ')[2])

  if (Number.isFinite(askedAt) && now - askedAt < FRESH_S) return

  const auth = await $.session.authorize()

  // no first-party login (an API key, a 3P provider, a gateway): no plan limits
  if (auth === null || auth.kind !== 'bearer') {
    if (last !== '') await $.fs.write(path, fableLine(null, now))
    return
  }

  const response = await $.http.fetch(USAGE_URL, {
    auth: auth.handle,
    headers: { 'Content-Type': 'application/json', 'anthropic-beta': 'oauth-2025-04-20' },
  })

  if (!response.ok) {
    $.ui.log(`daiver-prompt-view: the Fable limit was not read: the usage answered ${response.status}`, { to: 'debug' })
    return
  }

  await $.fs.write(path, fableLine(fableOf(JSON.parse(response.text)), now))
}

function tryReadFable($: EngineInterface) {
  readFable($).catch(error => $.ui.log(`daiver-prompt-view: the Fable limit was not read: ${error instanceof Error ? error.message : String(error)}`, { to: 'debug' }))
}

// on every session start: a read now (in the background, never holding the
// start) and every few minutes
export function startFable($: EngineInterface) {
  tryReadFable($)
  $.clock.every(EVERY_MS, () => tryReadFable($))
}
