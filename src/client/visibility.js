import { getPrefs, subscribePrefs } from './prefs.js'

const listeners = new Set()
const collapsedBySession = new Map()

let currentSessionId

function emit() {
  for (const listener of listeners) listener()
  const open = getPrefs().enabled !== false && !isCollapsed()
  if (typeof document !== 'undefined') {
    const root = document.documentElement
    if (open) root.setAttribute('data-dsh-side-panels-open', '')
    else root.removeAttribute('data-dsh-side-panels-open')
  }
}

subscribePrefs(() => emit())

export function subscribeVisibility(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setCurrentSession(sessionId) {
  currentSessionId = sessionId
  emit()
}

export function currentSession() {
  return currentSessionId
}

export function isCollapsed(sessionId = currentSessionId) {
  const key = sessionId ?? ''
  if (collapsedBySession.has(key)) return collapsedBySession.get(key) === true
  return getPrefs().startCollapsed === true
}

export function toggleCollapsed(sessionId = currentSessionId) {
  const key = sessionId ?? ''
  collapsedBySession.set(key, !isCollapsed(key))
  emit()
}

export function setCollapsed(sessionId, collapsed) {
  collapsedBySession.set(sessionId ?? '', collapsed === true)
  emit()
}
