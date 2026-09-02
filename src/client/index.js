import { HeaderToggle } from './Workbench.jsx'
import { mountWorkbench } from './mount.js'
import { attachPrefs } from './prefs.js'
import { SettingsPage } from './SettingsPage.jsx'

export const name = 'dsh-side-panels'
export const inject = ['slots', 'sessions']

export function apply(ctx) {
  ctx.effect(() => {
    try {
      return mountWorkbench(ctx.sessions)
    } catch (error) {
      console.error('[dsh-side-panels] mount failed', error)
      return () => {}
    }
  }, 'dsh-side-panels: workbench')

  ctx.inject(['slots'], (scope) => {
    scope.slots.inject('conversation.session.header.utilities', () => {
      try {
        return scope.slots.register({
          name: 'conversation.session.header.utilities',
          id: 'dsh-side-panels-toggle',
          order: 1000,
        }, HeaderToggle)
      } catch {
        return () => {}
      }
    })
    scope.slots.inject('settings.section', () => {
      try {
        return scope.slots.register({
          name: 'settings.section',
          id: 'dsh-side-panels',
          order: 18,
          label: () => '工作台',
        }, SettingsPage)
      } catch {
        return () => {}
      }
    })
  })

  ctx.inject(['settingsScope'], (scope) => {
    scope.effect(() => {
      try {
        return attachPrefs(scope.settingsScope)
      } catch {
        return () => {}
      }
    }, 'dsh-side-panels: prefs')
  })
}
