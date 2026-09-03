/** 这条对话里打开过的网页，不进日常 Chrome。 */

import { isPlaceholderTitle, normalizeNavigateUrl, sessionKey, tabLabel } from './browser-id.js'

export const HISTORY_LIMIT = 120

export function isHistoryUrl(url) {
  const parsed = normalizeNavigateUrl(url)
  if (!parsed.ok || parsed.url === 'about:blank') return false
  return parsed.url.startsWith('http://') || parsed.url.startsWith('https://')
}

export function historyStorageKey(sessionId) {
  return `dsh-sp-history:${sessionKey(sessionId)}`
}

export function historyHost(url) {
  try {
    return new URL(url).hostname || String(url || '')
  } catch {
    return String(url || '')
  }
}

export function visitTitle(url, title) {
  const name = String(title || '').trim()
  if (name && !isPlaceholderTitle(name)) return name.slice(0, 80)
  return tabLabel(url, '').slice(0, 80)
}

export function rememberVisit(list, visit, limit = HISTORY_LIMIT) {
  const url = String(visit?.url || '').trim()
  const rows = Array.isArray(list) ? list : []
  if (!isHistoryUrl(url)) return rows
  const at = Number(visit?.at) || Date.now()
  return [
    { url, title: visitTitle(url, visit?.title), at },
    ...rows.filter((row) => row?.url !== url),
  ].slice(0, limit)
}

export function forgetVisit(list, url) {
  const rows = Array.isArray(list) ? list : []
  const target = String(url || '').trim()
  if (!target) return rows
  return rows.filter((row) => row?.url !== target)
}

export function touchVisitTitle(list, url, title) {
  const rows = Array.isArray(list) ? list : []
  const name = String(title || '').trim()
  if (!isHistoryUrl(url) || !name || isPlaceholderTitle(name)) return rows
  const clipped = name.slice(0, 80)
  let changed = false
  const next = rows.map((row) => {
    if (row.url !== url || row.title === clipped) return row
    changed = true
    return { ...row, title: clipped }
  })
  return changed ? next : rows
}

export function formatVisitTime(at, now = Date.now()) {
  const ts = Number(at) || 0
  if (!ts) return ''
  const date = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
  const startToday = new Date(now)
  startToday.setHours(0, 0, 0, 0)
  const start = startToday.getTime()
  if (ts >= start) return time
  if (ts >= start - 86400000) return `昨天 ${time}`
  return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`
}

export function readVisitList(raw) {
  try {
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    return list
      .filter((row) => row && isHistoryUrl(row.url))
      .map((row) => ({
        url: String(row.url),
        title: visitTitle(row.url, row.title),
        at: Number(row.at) || 0,
      }))
      .slice(0, HISTORY_LIMIT)
  } catch {
    return []
  }
}
