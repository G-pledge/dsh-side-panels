import { createRoot } from 'react-dom/client'
import { createElement as h } from 'react'
import { Workbench } from './Workbench.jsx'
import { OPEN_STYLE } from './styles.js'
import {
  setCurrentSession, subscribeVisibility, toggleCollapsed,
} from './visibility.js'

const COLUMN = '[data-pane="conversation"], [class*="centerCol"]'

/** 启动时先让官方插件名单转完，再开始找对话列。 */
const BOOT_WAIT_MS = 800
/** 对话列还没出现时，隔一会儿看一次，不盯整页。 */
const POLL_MS = 250

function ensureStyle() {
  const existing = document.querySelector('style[data-dsh-side-panels-style]')
  if (existing) return existing
  const style = document.createElement('style')
  style.dataset.dshSidePanelsStyle = ''
  style.textContent = OPEN_STYLE
  document.head.appendChild(style)
  return style
}

function conversationColumn() {
  return document.querySelector(COLUMN) ?? undefined
}

/**
 * 把工作台挂到对话列右边；会话一变就换自己的树。
 * 启动阶段不用整页监听，避免拖住「Loading plugins」。
 */
export function mountWorkbench(sessions) {
  const style = ensureStyle()
  let panelRoot
  let panelEl
  let stopped = false
  let scheduled = false
  let pollTimer
  let bootTimer
  let columnObserver

  const ensurePanel = () => {
    if (stopped) return
    const column = conversationColumn()
    if (column === undefined) return
    if (panelEl !== undefined) {
      if (panelEl.parentElement !== column) column.appendChild(panelEl)
      return
    }
    panelEl = document.createElement('div')
    panelEl.dataset.dshSidePanelsHost = ''
    panelEl.style.display = 'contents'
    column.appendChild(panelEl)
    panelRoot = createRoot(panelEl)
    panelRoot.render(h(Workbench, { sessions }))
  }

  const watchColumn = () => {
    const column = conversationColumn()
    if (column === undefined || columnObserver !== undefined) return
    columnObserver = new MutationObserver(() => {
      if (stopped) return
      if (panelEl !== undefined && panelEl.isConnected) return
      schedule()
    })
    columnObserver.observe(column, { childList: true })
  }

  const schedule = () => {
    if (stopped || scheduled) return
    scheduled = true
    requestAnimationFrame(() => {
      scheduled = false
      if (stopped) return
      ensurePanel()
      const mounted = panelEl !== undefined && panelEl.isConnected
      if (mounted) {
        if (pollTimer !== undefined) {
          clearInterval(pollTimer)
          pollTimer = undefined
        }
        watchColumn()
      }
    })
  }

  const syncSession = () => {
    const snap = sessions.list.getSnapshot()
    setCurrentSession(snap.current)
  }

  const unsubSessions = sessions.list.subscribe(syncSession)
  const unsubVis = subscribeVisibility(() => {})
  syncSession()

  bootTimer = setTimeout(() => {
    if (stopped) return
    schedule()
    if (pollTimer === undefined) pollTimer = setInterval(schedule, POLL_MS)
  }, BOOT_WAIT_MS)

  const onKey = (event) => {
    if (event.key === 'Escape' && event.altKey) toggleCollapsed()
  }
  document.addEventListener('keydown', onKey)

  return () => {
    stopped = true
    if (bootTimer !== undefined) clearTimeout(bootTimer)
    if (pollTimer !== undefined) clearInterval(pollTimer)
    columnObserver?.disconnect()
    unsubSessions()
    unsubVis()
    document.removeEventListener('keydown', onKey)
    panelRoot?.unmount()
    panelEl?.remove()
    style.remove()
    document.documentElement.removeAttribute('data-dsh-side-panels-open')
  }
}
