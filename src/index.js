/**
 * dsh-side-panels — 电脑端：按会话工作目录列目录、读文件、新建、改名、保存，禁止越界；并开本地终端和独立浏览器。
 */
import { registerBrowser } from './host/browser-routes.js'
import { createFsService } from './host/fs-service.js'
import { registerRoutes, workspacePaths } from './host/routes.js'
import { readShellChoice, registerSettings } from './host/settings.js'
import { registerTerminal } from './host/terminal-routes.js'

export const name = 'dsh-side-panels'
export const inject = ['webServer', 'workspaceRegistry']

export function apply(ctx) {
  try {
    registerSettings(ctx)
  } catch (error) {
    console.warn('[dsh-side-panels] settings skipped', error)
  }
  ctx.inject(['webServer', 'workspaceRegistry'], (hostCtx) => {
    const fs = createFsService(() => workspacePaths(hostCtx))
    hostCtx.effect(() => registerRoutes(hostCtx, fs), 'dsh-side-panels: file routes')
    hostCtx.effect(() => registerTerminal(hostCtx, fs, () => readShellChoice(ctx)), 'dsh-side-panels: terminal')
    hostCtx.effect(() => registerBrowser(hostCtx), 'dsh-side-panels: browser')
  })
}
