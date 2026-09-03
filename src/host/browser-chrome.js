import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { sessionKey } from '../shared/browser-id.js'

export { isAllowedUrl, normalizeNavigateUrl, partitionName, sessionKey } from '../shared/browser-id.js'

const PROFILE_ROOT = join(homedir(), '.dsh-side-panels', 'browser-profiles')

export function profileDir(sessionId) {
  return join(PROFILE_ROOT, sessionKey(sessionId))
}

export function profileRoot() {
  return PROFILE_ROOT
}

export function findChrome() {
  const env = process.env
  const candidates = []
  if (process.platform === 'win32') {
    candidates.push(
      join(env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(env.PROGRAMFILES || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(env['PROGRAMFILES(X86)'] || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
      join(env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      join(env.PROGRAMFILES || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      join(env['PROGRAMFILES(X86)'] || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
    )
  } else if (process.platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Chromium.app/Contents/MacOS/Chromium',
    )
  } else {
    candidates.push(
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/usr/bin/microsoft-edge',
      '/snap/bin/chromium',
    )
  }
  return candidates.find((path) => path && existsSync(path)) ?? ''
}
