import z from 'schemastery'

export const SETTINGS_NS = 'dsh-side-panels'

export const Config = z.object({
  enabled: z.boolean().default(true),
  terminalTheme: z.union(['follow', 'dark']).default('follow'),
  startCollapsed: z.boolean().default(false),
  shell: z.union(['auto', 'cmd', 'powershell', 'custom']).default('auto'),
  customPath: z.string().default(''),
  devtoolsMode: z.union(['bottom', 'detach']).default('bottom'),
})

export function readShellChoice(ctx) {
  try {
    const value = ctx.get?.('settings')?.get?.(SETTINGS_NS)
    if (!value || typeof value !== 'object') return { shell: 'auto', customPath: '' }
    const shell = value.shell
    return {
      shell: shell === 'cmd' || shell === 'powershell' || shell === 'custom' ? shell : 'auto',
      customPath: typeof value.customPath === 'string' ? value.customPath : '',
    }
  } catch {
    return { shell: 'auto', customPath: '' }
  }
}

/** 把工作台配置登记进 DSH 设置，改完立刻生效。 */
export function registerSettings(ctx) {
  ctx.inject(['settings'], (scope) => {
    scope.settings.register(SETTINGS_NS, Config, { applies: 'live' })
  })
}
