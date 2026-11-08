import type { ConfigValue, EngineInterface } from 'claude-code'

// sets this plugin's /config row of the userConfig field; the reason when it was refused
export async function setOption($: EngineInterface, field: string, value: ConfigValue) {
  const row = (await $.config.list()).find(one => one.provider.plugin === $.plugin.name && one.key.endsWith(`.${field}`))

  return row === undefined ? undefined : (await $.config.set({ key: row.key, value })).deny
}
