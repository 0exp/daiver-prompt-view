import type { ConfigValue, EngineInterface } from 'claude-code'

// sets this plugin's /config row of the userConfig field; the reason when it
// was refused. With no row to set (another plugin filters the list, the
// option is not in this build's /config) the change holds for the session
// alone, and a toast says so
export async function setOption($: EngineInterface, field: string, value: ConfigValue) {
  const row = (await $.config.list()).find(one => one.provider.plugin === $.plugin.name && one.key.endsWith(`.${field}`))

  if (row === undefined) {
    $.ui.toast(`daiver-prompt-view: the ${field} option has no /config row to save to; the change holds for this session`)
    return undefined
  }

  return (await $.config.set({ key: row.key, value })).deny
}
