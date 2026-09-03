/** 对话钥匙和网址规则，浏览器端和电脑端共用。 */

export function sessionKey(sessionId) {
  const raw = String(sessionId ?? '').trim() || 'default'
  const safe = raw.replace(/[^a-zA-Z0-9._-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 48) || 'session'
  let hash = 2166136261
  for (let i = 0; i < raw.length; i += 1) {
    hash ^= raw.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return `${safe}-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function partitionName(sessionId) {
  return `persist:dsh-sp-${sessionKey(sessionId)}`
}

/** 地址栏和遥控导航只走网页，避免 file / javascript 摸到本机。 */
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

/** 空白页占位名，不能当成真正的网页标题留下。 */
export function isPlaceholderTitle(title) {
  const name = String(title || '').trim()
  return !name || name === '新标签' || name === 'about:blank'
}

/** 标签上显示的名字：优先网页标题，否则用站点名。 */
export function tabLabel(url, title) {
  const name = String(title || '').trim()
  if (name && !isPlaceholderTitle(name)) return name.slice(0, 40)
  if (!url || url === 'about:blank') return '新标签'
  try {
    const parsed = new URL(url)
    if (parsed.protocol === 'about:') return '新标签'
    return parsed.hostname || parsed.href.slice(0, 40)
  } catch {
    return '新标签'
  }
}

/** 只有整页自己失败才提示，页面里的小框失败不当成打不开。 */
export function shouldShowLoadError(event) {
  if (!event || event.isMainFrame === false) return false
  const code = Number(event.errorCode) || 0
  if (!code || code === -3) return false
  const url = String(event.validatedURL || event.url || '')
  if (/^(chrome-devtools:|devtools:|chrome-error:|chrome:)/i.test(url)) return false
  return true
}
