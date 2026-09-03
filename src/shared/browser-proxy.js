/** 嵌页代理：只动这条对话的登录本，不碰日常 Chrome。 */

import { sessionKey } from './browser-id.js'

export const PROXY_PROFILES_KEY = 'dsh-sp-proxy-profiles'
export const PROXY_DIRECT = 'direct'
export const PROXY_SYSTEM = 'system'
export const PROXY_TYPES = ['http', 'socks5', 'socks4']

export function proxyActiveKey(sessionId) {
  return `dsh-sp-proxy-active:${sessionKey(sessionId)}`
}

export function isProxyHost(host) {
  const text = String(host || '').trim()
  if (!text || text.length > 253) return false
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(text)) return false
  if (text.includes('/') || text.includes(' ')) return false
  if (text.startsWith('[')) return /^\[[0-9a-fA-F:]+\]$/.test(text)
  if (text.includes(':')) return false
  return /^[a-zA-Z0-9.-]+$/.test(text)
}

export function proxyTypeOf(raw) {
  const type = String(raw || '').trim().toLowerCase()
  return PROXY_TYPES.includes(type) ? type : 'http'
}

export function buildProxyRules(profile) {
  const host = String(profile?.host || '').trim()
  const port = Number(profile?.port)
  const type = proxyTypeOf(profile?.type)
  if (!isProxyHost(host)) return { ok: false, error: '主机地址无效' }
  if (!Number.isInteger(port) || port < 1 || port > 65535) return { ok: false, error: '端口无效' }
  const target = `${host}:${port}`
  if (type === 'socks5') return { ok: true, rules: `socks5://${target}` }
  if (type === 'socks4') return { ok: true, rules: `socks4://${target}` }
  return { ok: true, rules: `http://${target}` }
}

export function formatProxyAddr(profile) {
  const next = buildProxyRules(profile)
  return next.ok ? next.rules : ''
}

export function buildBypassRules(raw) {
  const extra = String(raw || '')
    .split(/[\n,]+/)
    .map((row) => row.trim())
    .filter(Boolean)
  const base = ['localhost', '127.0.0.1', '::1', '<local>']
  const seen = new Set(base.map((row) => row.toLowerCase()))
  const list = [...base]
  for (const row of extra) {
    const key = row.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    list.push(row)
  }
  return list.join(',')
}

export function sanitizeProxyProfile(raw, id) {
  const name = String(raw?.name || '').trim().slice(0, 40)
  if (!name) return { ok: false, error: '先填名称' }
  const type = proxyTypeOf(raw?.type)
  const host = String(raw?.host || '').trim()
  const port = Number(raw?.port)
  const bypass = String(raw?.bypass || '').trim()
  const rules = buildProxyRules({ type, host, port })
  if (!rules.ok) return rules
  const nextId = String(id || raw?.id || '').trim() || `px-${Date.now().toString(36)}`
  return {
    ok: true,
    profile: { id: nextId, name, type, host, port, bypass },
  }
}

export function readProxyProfiles(raw) {
  try {
    const list = JSON.parse(raw)
    if (!Array.isArray(list)) return []
    const out = []
    const seen = new Set()
    for (const row of list) {
      const next = sanitizeProxyProfile(row, row?.id)
      if (!next.ok || seen.has(next.profile.id)) continue
      seen.add(next.profile.id)
      out.push(next.profile)
    }
    return out.slice(0, 40)
  } catch {
    return []
  }
}

export function readProxyActive(raw, profiles) {
  const id = String(raw || '').trim()
  if (id === PROXY_DIRECT) return PROXY_DIRECT
  if (id === PROXY_SYSTEM || !id) return PROXY_SYSTEM
  if (Array.isArray(profiles) && profiles.some((row) => row.id === id)) return id
  return PROXY_SYSTEM
}

export function toSessionProxy(activeId, profiles) {
  const id = String(activeId || PROXY_SYSTEM)
  if (id === PROXY_DIRECT) return { ok: true, config: { mode: 'direct' } }
  if (id === PROXY_SYSTEM) return { ok: true, config: { mode: 'system' } }
  const profile = (Array.isArray(profiles) ? profiles : []).find((row) => row.id === id)
  if (!profile) return { ok: false, error: '找不到这条代理' }
  const rules = buildProxyRules(profile)
  if (!rules.ok) return rules
  return {
    ok: true,
    config: {
      mode: 'fixed_servers',
      proxyRules: rules.rules,
      proxyBypassRules: buildBypassRules(profile.bypass),
    },
  }
}
