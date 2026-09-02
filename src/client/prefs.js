export const SETTINGS_NS = 'dsh-side-panels'

export const DEFAULT_PREFS = {
  enabled: true,
  terminalTheme: 'follow',
  startCollapsed: false,
  shell: 'auto',
  customPath: '',
}

const listeners = new Set()
let bound
const memory = { ...DEFAULT_PREFS }
let cached = { ...DEFAULT_PREFS }

function samePrefs(left, right) {
  return left.enabled === right.enabled
    && left.terminalTheme === right.terminalTheme
    && left.startCollapsed === right.startCollapsed
    && left.shell === right.shell
    && left.customPath === right.customPath
}

function emit() {
  snapshotValue()
  for (const listener of listeners) listener()
}

function snapshotValue() {
  const snap = bound?.getSnapshot()
  const next = snap?.status === 'ready' && snap.value && typeof snap.value === 'object'
    ? { ...DEFAULT_PREFS, ...snap.value }
    : { ...DEFAULT_PREFS, ...memory }
  if (samePrefs(cached, next)) return cached
  cached = next
  return cached
}

export function attachPrefs(settingsScope) {
  bound = settingsScope.bind({ namespace: SETTINGS_NS })
  const stop = bound.subscribe(emit)
  emit()
  return () => {
    stop()
    bound = undefined
    emit()
  }
}

export function subscribePrefs(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getPrefs() {
  return snapshotValue()
}

export function setPref(field, value) {
  const snap = bound?.getSnapshot()
  if (snap?.writable) return bound.set(field, value)
  memory[field] = value
  emit()
  return Promise.resolve()
}
