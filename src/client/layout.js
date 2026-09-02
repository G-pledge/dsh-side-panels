const MIN_PANEL = 420
const MAX_PANEL_RATIO = 0.82
const DEFAULT_PANEL = 808
const MIN_TREE = 180
const MAX_TREE = 480
const DEFAULT_TREE = 268
export const RAIL = 48

const panelBySession = new Map()
const treeBySession = new Map()

export function clampPanelWidth(px) {
  const max = Math.max(MIN_PANEL, Math.floor((typeof window === 'undefined' ? 1200 : window.innerWidth) * MAX_PANEL_RATIO))
  return Math.min(max, Math.max(MIN_PANEL, Math.round(px)))
}

export function clampTreeWidth(px, panelWidth) {
  const room = Math.max(MIN_TREE, (panelWidth ?? DEFAULT_PANEL) - RAIL - 160)
  return Math.min(Math.min(MAX_TREE, room), Math.max(MIN_TREE, Math.round(px)))
}

export function defaultPanelWidth() {
  return clampPanelWidth(DEFAULT_PANEL)
}

export function defaultTreeWidth(panelWidth) {
  return clampTreeWidth(DEFAULT_TREE, panelWidth)
}

export function readPanelWidth(sessionId) {
  return panelBySession.get(sessionId ?? '') ?? defaultPanelWidth()
}

export function readTreeWidth(sessionId, panelWidth) {
  return treeBySession.get(sessionId ?? '') ?? defaultTreeWidth(panelWidth)
}

export function writePanelWidth(sessionId, px) {
  const next = clampPanelWidth(px)
  panelBySession.set(sessionId ?? '', next)
  applyPanelWidthVar(next)
  return next
}

export function writeTreeWidth(sessionId, px, panelWidth) {
  const next = clampTreeWidth(px, panelWidth)
  treeBySession.set(sessionId ?? '', next)
  return next
}

export function applyPanelWidthVar(px) {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty('--dsh-side-panels-width', `${px}px`)
}
