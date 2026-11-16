// buttons: a row above the prompt with two switches, each showing where it
// stands: the borders (the `borders` option, as `chat:show-borders` turns it)
// and the history pane (the `history` option, as `history:show` turns it). A
// click presses one, and so does its hotkey while the row holds the focus
// (ctrl+x tab): `b` the borders, `h` the history. The row itself is the
// `buttons` option, on by default (`chat:show-buttons`); it yields to a survey
import type { EngineInterface, On } from 'claude-code'
import { command, failed } from '../shared/commands'
import { config } from '../shared/config'
import { setOption } from '../shared/options'
import { hexOf, THEMES } from '../shared/themes'
import { setFrames } from './chat'
import { show } from './history'

export const BUTTONS = command('chat', 'show-buttons')

// how the band treated the row since the mod loaded, for mod:doctor: how many
// times the mod drew it, how many times the band's list was heard and how many
// of those held the row (a plugin above may answer the band over the mod, or
// leave the row out of its list)
export const band = { drawn: 0, lists: 0, listed: 0, isCollapsed: false, maxRows: 0 }

// what a switch reads: its name and where it stands
export const switchLabel = (name: string, isOn: boolean) => `${name}: ${isOn ? 'on' : 'off'}`

async function pressBorders($: EngineInterface) {
  const deny = await setFrames($, 'borders', !config.borders)
  if (deny !== undefined) await $.ui.log(`daiver-prompt-view: buttons: the borders were not changed: ${deny}`, { to: 'debug' })
}

async function pressHistory($: EngineInterface) {
  await show($, !config.history)
}

// show-buttons [on|off]: the buttons option, toggled when no argument
async function toggleButtons($: EngineInterface, args: string) {
  const arg = args.trim().toLowerCase()

  if (arg !== '' && arg !== 'on' && arg !== 'off') return { text: `Usage: /${BUTTONS} [on|off]` }

  const value = arg === '' ? !config.buttons : arg === 'on'
  const deny = await setOption($, 'buttons', value)

  if (deny !== undefined) return { text: `The buttons row was not changed: ${deny}` }

  config.buttons = value
  $.ui.invalidate('ui.render')

  return { text: `The buttons row is now ${value ? 'shown' : 'hidden'}.` }
}

export function registerButtons(on: On) {
  on('command.run', { command: BUTTONS }, ($, e) => toggleButtons($, e.args))
    .catch(($, e, next) => failed(next.error.message ?? next.error.kind))

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!config.buttons || e.props.hasSurvey) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    band.drawn += 1
    // every button in the theme's buttons color, on and off alike: the label says which;
    // dimColor dims the brackets Claude Code draws around it, which take no color of their own
    const color = hexOf(THEMES[config.theme]!.buttons)
    const borders = switchLabel('▣ borders', config.borders)
    const history = switchLabel('≡ history', config.history)

    return (
      <Box flexDirection="row">
        <Button key="borders" hotkey="b" label={borders} dimColor onPress={() => void pressBorders($).catch(() => undefined)}>
          <Text color={color}>{borders}</Text>
        </Button>
        <Text> </Text>
        <Button key="history" hotkey="h" label={history} dimColor onPress={() => void pressHistory($).catch(() => undefined)}>
          <Text color={color}>{history}</Text>
        </Button>
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // the band's list as it reaches the mod: whether the row is in it
  on('ui.render', { component: 'AbovePromptList' }, ($, e, next) => {
    band.lists += 1
    band.isCollapsed = e.props.isCollapsed
    band.maxRows = e.props.maxRows
    if (e.props.rows.some(row => row.plugin === $.plugin.name)) band.listed += 1

    return next(e)
  }).catch(($, e, next) => next(e))
}

const times = (n: number) => `${n} time${n === 1 ? '' : 's'}`

// the doctor's line on the row
export function bandReport() {
  if (!config.buttons) return 'buttons row: off (the buttons option); /daiver-prompt-view:chat:show-buttons on draws it'
  if (band.drawn === 0) return 'buttons row: never asked of the mod since it loaded: a plugin above answers the band over it'
  if (band.lists === 0) return `buttons row: drawn ${times(band.drawn)}, the band's list never reached the mod: a plugin above arranges the band without it`
  if (band.listed === 0) return `buttons row: drawn ${times(band.drawn)}, left out of the band's list all ${times(band.lists)}: a plugin above takes it away`

  const shown = band.isCollapsed
    ? 'the band is collapsed: ctrl+x ctrl+a (or its [+]) opens it'
    : band.maxRows < 1 ? 'the band has no row left above the prompt' : `the band open, ${band.maxRows} rows`

  return `buttons row: drawn ${times(band.drawn)}, in the band's list ${band.listed} of ${times(band.lists)}; ${shown}`
}
