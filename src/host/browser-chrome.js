import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

const PROFILE_ROOT = join(homedir(), '.dsh-side-panels', 'browser-profiles')

/** 对话 id 收成可当文件夹名的钥匙，两条对话绝不会落到同一目录。 */
export function sessionKey(sessionId) {
  const raw = String(sessionId ?? '').trim() || 'default'
  const safe = raw.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48) || 'session'
  const hash = createHash('sha256').update(raw).digest('hex').slice(0, 16)
  return `${safe}-${hash}`
}

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

/** 地址栏和 AI 导航只走网页，避免 file / javascript 摸到本机。 */
export function normalizeNavigateUrl(raw) {
  const text = String(raw ?? '').trim()
  if (text === '' || text === 'about:blank') return { ok: true, url: 'about:blank' }
  let url = text
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) url = `https://${url}`
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return { ok: false, error: '网址无效' }
  }
  const protocol = parsed.protocol.toLowerCase()
  if (protocol !== 'http:' && protocol !== 'https:' && parsed.href !== 'about:blank') {
    return { ok: false, error: '只打开网页地址' }
  }
  return { ok: true, url: parsed.href }
}

export function isAllowedUrl(url) {
  return normalizeNavigateUrl(url).ok === true
}
