import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { forgetVisit, formatVisitTime, historyHost, historyStorageKey, isHistoryUrl, readVisitList, rememberVisit, touchVisitTitle } from '../shared/browser-history.js'
import { faviconListFromEvent, isPlaceholderTitle, normalizeNavigateUrl, partitionName, readFaviconScript, shouldShowLoadError, tabLabel } from '../shared/browser-id.js'
import {
  buildErrorPageHtml,
  describeHttpError,
  describeNetError,
  inspectBlankScript,
  looksBlankPage,
  writeErrorPageScript,
} from '../shared/net-error-page.js'
import { PROXY_PROFILES_KEY, PROXY_SYSTEM, proxyActiveKey, readProxyActive, readProxyProfiles, toSessionProxy } from '../shared/browser-proxy.js'
import { BrowserProxyPanel } from './BrowserProxyPanel.jsx'
import { ConsolePromptIcon, DownloadTrayIcon, MoreDotsIcon, ProxyGlobeIcon } from './icons.jsx'
import { readDevtoolsMode } from './prefs.js'
import { S } from './styles.js'

let tabSeq = 0
function nextTabId() {
  tabSeq += 1
  return `tab-${tabSeq}`
}

function socketUrl(session) {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host || '127.0.0.1'
  const query = new URLSearchParams({ session: session ?? '' })
  return `${proto}//${host}/dsh-side-panels/browser?${query}`
}

function chromeUserAgent() {
  const ua = String(navigator.userAgent || '')
  if (!/Electron/i.test(ua)) return ua
  return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36'
}

function hasGuestApi(node, name) {
  return node && typeof node[name] === 'function'
}

function canUseWebview() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  const api = window.dshDesktop
  if (api && api.webview === true) return true
  if (api && api.webview === false) return false
  try {
    if (typeof customElements !== 'undefined' && customElements.get('webview')) return true
  } catch {
    // 没有自定义标签接口
  }
  try {
    const node = document.createElement('webview')
    if (hasGuestApi(node, 'getURL') || hasGuestApi(node, 'openDevTools')) return true
    const parent = document.body || document.documentElement
    if (!parent) return false
    node.setAttribute('style', 'position:fixed;width:0;height:0;opacity:0;pointer-events:none')
    parent.appendChild(node)
    const ok = hasGuestApi(node, 'getURL') || hasGuestApi(node, 'openDevTools')
    node.remove()
    return ok
  } catch {
    return false
  }
}

function guestUrl(guest, fallback) {
  try {
    if (hasGuestApi(guest, 'getURL')) {
      const next = guest.getURL()
      if (typeof next === 'string' && next) return next
    }
  } catch {
    // 还没就绪
  }
  const src = guest?.src
  if (typeof src === 'string' && src) return src
  return fallback || ''
}

function guestTitle(guest) {
  try {
    if (hasGuestApi(guest, 'getTitle')) {
      const title = guest.getTitle()
      if (!isPlaceholderTitle(title)) return title
    }
  } catch {
    // 跨页读不到标题
  }
  try {
    const title = guest?.contentDocument?.title
    if (!isPlaceholderTitle(title)) return title
  } catch {
    // 网站不让读
  }
  return ''
}

function guestWebContentsId(guest) {
  try {
    if (hasGuestApi(guest, 'getWebContentsId')) return guest.getWebContentsId()
  } catch {
    // 页面还没挂上
  }
  return 0
}

function sameSiteIcon(prevUrl, nextUrl, icon) {
  const data = String(icon || '')
  if (!data.startsWith('data:image')) return ''
  try {
    if (new URL(prevUrl).origin === new URL(nextUrl).origin) return data
  } catch {
    // 换站了
  }
  return ''
}

function waitTick(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function waitWebContentsId(guest, tries = 50) {
  for (let i = 0; i < tries; i += 1) {
    const id = guestWebContentsId(guest)
    if (id) return id
    await waitTick(50)
  }
  return 0
}

function waitFrame() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => window.requestAnimationFrame(resolve))
  })
}

function intersectBox(a, b) {
  const x = Math.max(a.x, b.x)
  const y = Math.max(a.y, b.y)
  const right = Math.min(a.x + a.width, b.x + b.width)
  const bottom = Math.min(a.y + a.height, b.y + b.height)
  return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) }
}

function elementBox(el) {
  const rect = el.getBoundingClientRect()
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
}

function addFrameOffset(box, doc) {
  let x = box.x
  let y = box.y
  let current = doc.defaultView
  while (current && current !== current.top) {
    let frame
    try {
      frame = current.frameElement
    } catch {
      break
    }
    if (!frame) break
    const fr = frame.getBoundingClientRect()
    x += fr.left
    y += fr.top
    current = current.parent
  }
  return { ...box, x, y }
}

function measureDockBox(dock, clip, visible) {
  if (!dock) return { x: 0, y: 0, width: 0, height: 0, visible: false }
  let box = elementBox(dock)
  if (clip) box = intersectBox(box, elementBox(clip))
  const view = dock.ownerDocument.defaultView
  box = intersectBox(box, {
    x: 0,
    y: 0,
    width: view ? view.innerWidth : box.width,
    height: view ? view.innerHeight : box.height,
  })
  box = addFrameOffset(box, dock.ownerDocument)
  try {
    const topWin = window.top
    if (topWin && topWin !== window) {
      box = intersectBox(box, { x: 0, y: 0, width: topWin.innerWidth, height: topWin.innerHeight })
    }
  } catch {
    // 跨页读不到外层
  }
  const width = Math.round(box.width)
  const height = Math.round(box.height)
  return {
    x: Math.round(box.x),
    y: Math.round(box.y),
    width,
    height,
    visible: Boolean(visible) && width >= 32 && height >= 32,
  }
}

async function waitForDockBox(dock) {
  if (!dock) return { width: 0, height: 0 }
  for (let i = 0; i < 24; i += 1) {
    const box = dock.getBoundingClientRect()
    if (box.width >= 32 && box.height >= 32) {
      return { width: Math.round(box.width), height: Math.round(box.height) }
    }
    await waitFrame()
  }
  const box = dock.getBoundingClientRect()
  return {
    width: Math.max(1, Math.round(box.width)),
    height: Math.max(1, Math.round(box.height)),
  }
}

function snapshotScript() {
  return `(() => {
    const lines = []
    const walk = (el, depth) => {
      if (!el || lines.length >= 400) return
      const role = el.getAttribute('role') || el.tagName.toLowerCase()
      const name = String(el.getAttribute('aria-label') || el.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 80)
      if (name) lines.push('  '.repeat(depth) + role + ': ' + name)
      for (const child of el.children) walk(child, depth + 1)
    }
    walk(document.body, 0)
    return { url: location.href, title: document.title, text: lines.join('\\n') }
  })()`
}

function clickScript(action) {
  if (action.selector) {
    return `(() => {
      const node = document.querySelector(${JSON.stringify(String(action.selector))})
      if (!node) throw new Error('找不到这个元素')
      node.click()
      return { url: location.href, title: document.title }
    })()`
  }
  const x = Number(action.x) || 0
  const y = Number(action.y) || 0
  return `(() => {
    const node = document.elementFromPoint(${x}, ${y})
    if (!node) throw new Error('这一点没有元素')
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: ${x}, clientY: ${y} }))
    return { url: location.href, title: document.title }
  })()`
}

function typeScript(action) {
  const text = String(action.text ?? '')
  if (action.selector) {
    return `(() => {
      const node = document.querySelector(${JSON.stringify(String(action.selector))})
      if (!node) throw new Error('找不到输入框')
      node.focus()
      node.value = ${JSON.stringify(text)}
      node.dispatchEvent(new Event('input', { bubbles: true }))
      return true
    })()`
  }
  return `(() => {
    const node = document.activeElement
    if (!node) throw new Error('没有焦点')
    node.value = (node.value || '') + ${JSON.stringify(text)}
    node.dispatchEvent(new Event('input', { bubbles: true }))
    return true
  })()`
}

function loadVisits(sessionId) {
  try {
    return readVisitList(window.localStorage.getItem(historyStorageKey(sessionId)))
  } catch {
    return []
  }
}

function saveVisits(sessionId, list) {
  try {
    window.localStorage.setItem(historyStorageKey(sessionId), JSON.stringify(list))
  } catch {
    // 存不下就算了
  }
}

function loadProxyProfiles() {
  try {
    return readProxyProfiles(window.localStorage.getItem(PROXY_PROFILES_KEY))
  } catch {
    return []
  }
}

function saveProxyProfiles(list) {
  try {
    window.localStorage.setItem(PROXY_PROFILES_KEY, JSON.stringify(list))
  } catch {
    // 存不下就算了
  }
}

function loadProxyActive(sessionId, profiles) {
  try {
    return readProxyActive(window.localStorage.getItem(proxyActiveKey(sessionId)), profiles)
  } catch {
    return PROXY_SYSTEM
  }
}

function saveProxyActive(sessionId, id) {
  try {
    window.localStorage.setItem(proxyActiveKey(sessionId), id)
  } catch {
    // 存不下就算了
  }
}

async function pushProxy(sessionId, activeId, profiles) {
  const api = typeof window !== 'undefined' ? window.dshDesktop : undefined
  if (!api || typeof api.setBrowserProxy !== 'function') return { ok: false, missing: true }
  const next = toSessionProxy(activeId, profiles)
  if (!next.ok) return next
  try {
    const result = await api.setBrowserProxy(partitionName(sessionId), next.config)
    return result?.ok ? { ok: true } : { ok: false }
  } catch {
    return { ok: false }
  }
}

async function recoverBlankGuest(guest) {
  if (!guest || !hasGuestApi(guest, 'executeJavaScript')) return
  const href = guestUrl(guest)
  if (!href || href === 'about:blank' || /^(chrome-devtools:|devtools:|chrome:)/i.test(href)) return
  if (guest._dshErrorBusy) return
  guest._dshErrorBusy = true
  try {
    const info = await guest.executeJavaScript(inspectBlankScript())
    if (!looksBlankPage(info)) {
      guest._dshNetFail = null
      return
    }
    const target = String(guest._dshNetFail?.url || info?.href || href)
    if (!target || target === 'about:blank' || !/^https?:/i.test(target)) {
      guest._dshNetFail = null
      return
    }
    const fail = guest._dshNetFail
    guest._dshNetFail = null
    const status = Number(info?.status) || 0
    const copy = fail
      ? describeNetError(fail.code, fail.url || target, fail.description)
      : status >= 400
        ? describeHttpError(status, target)
        : describeNetError(-324, target, 'ERR_EMPTY_RESPONSE')
    await guest.executeJavaScript(writeErrorPageScript(buildErrorPageHtml({ ...copy, reloadUrl: target })))
  } catch {
    // 页还没挂上
  } finally {
    guest._dshErrorBusy = false
  }
}

function percent(item) {
  const total = Number(item.total) || 0
  const received = Number(item.received) || 0
  if (total <= 0) return item.state === 'completed' ? 100 : 0
  return Math.min(100, Math.round((received / total) * 100))
}

export function BrowserView({ sessionId, paneId, active }) {
  const stageRef = useRef(null)
  const dockRef = useRef(null)
  const wrapRef = useRef(null)
  const guestRef = useRef(null)
  const guestsRef = useRef(new Map())
  const socketRef = useRef(null)
  const urlRef = useRef(null)
  const editing = useRef(false)
  const activeIdRef = useRef('')
  const addTabRef = useRef(() => {})
  const applyRef = useRef(async () => {})
  const dockOpenRef = useRef(false)
  const dockGenRef = useRef(0)
  const activeRef = useRef(active)
  const lastDockKeyRef = useRef('')
  const [tabs, setTabs] = useState([])
  const [activeId, setActiveId] = useState('')
  const [draft, setDraft] = useState('')
  const [url, setUrl] = useState('about:blank')
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState()
  const [downloads, setDownloads] = useState([])
  const [dlOpen, setDlOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [proxyOpen, setProxyOpen] = useState(false)
  const [proxyProfiles, setProxyProfiles] = useState([])
  const [proxyActive, setProxyActive] = useState(PROXY_SYSTEM)
  const [visits, setVisits] = useState([])
  const dlWrapRef = useRef(null)
  const moreWrapRef = useRef(null)
  const proxyWrapRef = useRef(null)
  const popupOpenRef = useRef(false)
  const [dockOpen, setDockOpen] = useState(false)
  const tabsRef = useRef(tabs)
  tabsRef.current = tabs
  const popupOpen = dlOpen || moreOpen || historyOpen || proxyOpen
  popupOpenRef.current = popupOpen

  activeIdRef.current = activeId
  dockOpenRef.current = dockOpen
  activeRef.current = active

  const readNav = (guest) => {
    if (!guest) return
    try {
      if (hasGuestApi(guest, 'canGoBack')) setCanGoBack(Boolean(guest.canGoBack()))
      if (hasGuestApi(guest, 'canGoForward')) setCanGoForward(Boolean(guest.canGoForward()))
      const next = guestUrl(guest)
      if (!next) return
      if (/^(chrome-error:|chrome:|devtools:|chrome-devtools:)/i.test(next)) return
      setUrl(next)
      if (!editing.current) setDraft(next === 'about:blank' ? '' : next)
      const id = guest.dataset.tabId || activeIdRef.current
      const title = guestTitle(guest)
      setTabs((prev) => prev.map((tab) => (
        tab.id === id ? { ...tab, url: next, title: tabLabel(next, title || tab.title), icon: sameSiteIcon(tab.url, next, tab.icon) } : tab
      )))
    } catch {
      // 跨页读不到地址
    }
  }

  const showTab = (id) => {
    for (const [tabId, node] of guestsRef.current) {
      const on = tabId === id
      node.style.visibility = on ? 'visible' : 'hidden'
      node.style.zIndex = on ? '1' : '0'
      node.style.pointerEvents = on && !popupOpenRef.current ? 'auto' : 'none'
    }
    guestRef.current = guestsRef.current.get(id) ?? null
    readNav(guestRef.current)
  }

  const mountGuest = (id, startUrl) => {
    const stage = stageRef.current
    if (!stage) return
    const embed = canUseWebview()
    const guest = document.createElement(embed ? 'webview' : 'iframe')
    guest.setAttribute('data-dsh-browser-guest', '')
    guest.dataset.tabId = id
    guest.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;background:#fff;visibility:hidden;z-index:0'
    if (embed) {
      guest.setAttribute('partition', partitionName(sessionId))
      guest.setAttribute('allowpopups', 'on')
      guest.setAttribute('useragent', chromeUserAgent())
    } else {
      guest.setAttribute('referrerpolicy', 'no-referrer-when-downgrade')
      guest.setAttribute('allow', 'clipboard-read; clipboard-write; fullscreen')
    }
    const onStart = () => {
      guest._dshIconGen = (guest._dshIconGen || 0) + 1
      guest._dshFavicons = []
      if (activeIdRef.current === id) setLoading(true)
    }
    const captureIcon = async () => {
      if (!hasGuestApi(guest, 'executeJavaScript')) return
      const page = guestUrl(guest)
      if (!page || page === 'about:blank' || /^(chrome-devtools:|devtools:|chrome:)/i.test(page)) return
      const gen = guest._dshIconGen || 0
      try {
        const data = await guest.executeJavaScript(readFaviconScript(guest._dshFavicons, page))
        if (gen !== (guest._dshIconGen || 0)) return
        if (!data || !String(data).startsWith('data:image')) return
        setTabs((prev) => prev.map((tab) => (
          tab.id === id ? { ...tab, icon: data } : tab
        )))
      } catch {
        // 读不到图标
      }
    }
    const onStop = () => {
      const next = guestUrl(guest)
      const title = guestTitle(guest)
      if (next && !/^(chrome-error:|chrome:|devtools:|chrome-devtools:)/i.test(next)) {
        setTabs((prev) => prev.map((tab) => (
          tab.id === id ? { ...tab, url: next, title: tabLabel(next, title || tab.title) } : tab
        )))
      }
      if (activeIdRef.current === id) {
        setLoading(false)
        readNav(guest)
      }
    }
    const onStopped = () => {
      onStop()
      void recoverBlankGuest(guest)
      void captureIcon()
    }
    const onNav = (event) => {
      const next = event?.url || guestUrl(guest)
      if (typeof next !== 'string' || !next) return
      if (/^(chrome-error:|chrome:|devtools:|chrome-devtools:)/i.test(next)) {
        if (activeIdRef.current === id) {
          setError(undefined)
          setLoading(false)
        }
        return
      }
      const title = event?.title || guestTitle(guest)
      setTabs((prev) => prev.map((tab) => (
        tab.id === id ? { ...tab, url: next, title: tabLabel(next, title || tab.title), icon: sameSiteIcon(tab.url, next, tab.icon) } : tab
      )))
      if (isHistoryUrl(next)) {
        setVisits((prev) => {
          const list = rememberVisit(prev, { url: next, title, at: Date.now() })
          saveVisits(sessionId, list)
          return list
        })
      }
      if (activeIdRef.current === id) {
        setError(undefined)
        setUrl(next)
        if (!editing.current) setDraft(next === 'about:blank' ? '' : next)
        readNav(guest)
      }
    }
    const onTitle = (event) => {
      const title = event?.title || guestTitle(guest)
      if (isPlaceholderTitle(title)) return
      setTabs((prev) => prev.map((tab) => (
        tab.id === id ? { ...tab, title: tabLabel(tab.url, title) } : tab
      )))
      const next = guestUrl(guest)
      if (!isHistoryUrl(next)) return
      setVisits((prev) => {
        const list = touchVisitTitle(prev, next, title)
        if (list === prev) return prev
        saveVisits(sessionId, list)
        return list
      })
    }
    const onFavicon = (event) => {
      guest._dshFavicons = faviconListFromEvent(event)
      void captureIcon()
    }
    const onFail = (event) => {
      if (!shouldShowLoadError(event)) return
      guest._dshNetFail = {
        code: event.errorCode,
        description: event.errorDescription,
        url: event.validatedURL || event.url || guestUrl(guest),
      }
      if (activeIdRef.current === id) setLoading(false)
      void waitTick(80).then(() => recoverBlankGuest(guest))
    }
    const onNewWindow = (event) => {
      if (typeof event?.preventDefault === 'function') event.preventDefault()
      const next = event?.url
      if (typeof next === 'string' && next.startsWith('http')) addTabRef.current(next)
    }
    guest.addEventListener('did-start-loading', onStart)
    guest.addEventListener('did-stop-loading', onStopped)
    guest.addEventListener('did-navigate', onNav)
    guest.addEventListener('did-navigate-in-page', onNav)
    guest.addEventListener('did-finish-load', onStop)
    guest.addEventListener('dom-ready', onStop)
    guest.addEventListener('page-title-updated', onTitle)
    guest.addEventListener('page-favicon-updated', onFavicon)
    guest.addEventListener('did-fail-load', onFail)
    guest.addEventListener('load', onStop)
    guest.addEventListener('new-window', onNewWindow)
    guest._dshOff = () => {
      guest.removeEventListener('did-start-loading', onStart)
      guest.removeEventListener('did-stop-loading', onStopped)
      guest.removeEventListener('did-navigate', onNav)
      guest.removeEventListener('did-navigate-in-page', onNav)
      guest.removeEventListener('did-finish-load', onStop)
      guest.removeEventListener('dom-ready', onStop)
      guest.removeEventListener('page-title-updated', onTitle)
      guest.removeEventListener('page-favicon-updated', onFavicon)
      guest.removeEventListener('did-fail-load', onFail)
      guest.removeEventListener('load', onStop)
      guest.removeEventListener('new-window', onNewWindow)
    }
    stage.appendChild(guest)
    guest.src = startUrl || 'about:blank'
    guestsRef.current.set(id, guest)
  }

  const dropGuest = (id) => {
    const guest = guestsRef.current.get(id)
    if (!guest) return
    try {
      guest._dshOff?.()
    } catch {
      // 已经卸了
    }
    guest.remove()
    guestsRef.current.delete(id)
  }

  const currentDockBox = (visible) => measureDockBox(
    dockRef.current,
    wrapRef.current,
    visible,
  )

  const pushDockBox = (force = false) => {
    const api = window.dshDesktop
    if (!api || typeof api.moveGuestDevtools !== 'function') return
    const box = currentDockBox(dockOpenRef.current && activeRef.current)
    const key = `${box.x},${box.y},${box.width},${box.height},${box.visible}`
    if (!force && key === lastDockKeyRef.current) return
    lastDockKeyRef.current = key
    api.moveGuestDevtools(box)
  }

  const closeDocked = async () => {
    dockGenRef.current += 1
    lastDockKeyRef.current = ''
    const page = guestRef.current
    const api = window.dshDesktop
    try {
      if (hasGuestApi(page, 'closeDevTools')) page.closeDevTools()
    } catch {
      // 本来就没开
    }
    try {
      if (api && typeof api.closeGuestDevtools === 'function') await api.closeGuestDevtools(guestWebContentsId(page) || 0)
    } catch {
      // 主程序没接上
    }
  }

  const attachDocked = async () => {
    const gen = dockGenRef.current + 1
    dockGenRef.current = gen
    const page = guestRef.current
    const api = window.dshDesktop
    if (!page || !api || typeof api.attachGuestDevtools !== 'function') {
      setError('贴在网页底下需要桌面端嵌页')
      setDockOpen(false)
      return
    }
    const dock = dockRef.current
    if (!dock) {
      setError('调试区还没挂上，再点一次')
      return
    }
    await waitForDockBox(dock)
    if (gen !== dockGenRef.current) return
    const pageId = await waitWebContentsId(page)
    if (gen !== dockGenRef.current) return
    if (!pageId) {
      setError('调试区还没挂上，再点一次')
      setDockOpen(false)
      return
    }
    try {
      const box = currentDockBox(activeRef.current)
      const result = await api.attachGuestDevtools(pageId, box)
      if (gen !== dockGenRef.current) {
        try {
          if (result?.ok) await api.closeGuestDevtools(pageId)
        } catch {
          // 已经关了
        }
        return
      }
      if (result?.ok) {
        setError(undefined)
        lastDockKeyRef.current = `${box.x},${box.y},${box.width},${box.height},${box.visible}`
      } else {
        setError('调试区打不开')
        setDockOpen(false)
      }
    } catch {
      if (gen !== dockGenRef.current) return
      setError('调试区打不开')
      setDockOpen(false)
    }
  }

  const addTab = (startUrl = 'about:blank') => {
    const parsed = startUrl === 'about:blank' ? { ok: true, url: 'about:blank' } : normalizeNavigateUrl(startUrl)
    const url = parsed.ok ? parsed.url : 'about:blank'
    const id = nextTabId()
    setTabs((prev) => [...prev, { id, title: tabLabel(url, ''), url, icon: '' }])
    setActiveId(id)
    mountGuest(id, url)
    showTab(id)
    return id
  }
  addTabRef.current = addTab

  const closeTab = (id) => {
    const prev = tabsRef.current
    if (prev.length <= 1) {
      const only = prev[0]
      if (!only) return
      const guest = guestsRef.current.get(only.id)
      if (guest) guest.src = 'about:blank'
      setUrl('about:blank')
      setDraft('')
      setTabs([{ ...only, title: '新标签', url: 'about:blank', icon: '' }])
      return
    }
    const index = prev.findIndex((tab) => tab.id === id)
    const nextTabs = prev.filter((tab) => tab.id !== id)
    dropGuest(id)
    setTabs(nextTabs)
    if (activeIdRef.current === id) {
      const pick = nextTabs[index] ?? nextTabs[index - 1] ?? nextTabs[0]
      setActiveId(pick.id)
    }
  }

  const runInGuest = async (code) => {
    const guest = guestRef.current
    if (!guest) throw new Error('浏览器还没就绪')
    if (hasGuestApi(guest, 'executeJavaScript')) return guest.executeJavaScript(code)
    throw new Error('这个页面读不到，换桌面端嵌页后再试')
  }

  const applyAction = async (action) => {
    const guest = guestRef.current
    if (!guest) throw new Error('浏览器还没就绪')
    const type = action?.type ?? action?.action
    if (type === 'navigate') {
      const parsed = normalizeNavigateUrl(action.url)
      if (!parsed.ok) throw new Error(parsed.error)
      guest.src = parsed.url
      setUrl(parsed.url)
      setDraft(parsed.url === 'about:blank' ? '' : parsed.url)
      setLoading(true)
      setTabs((prev) => prev.map((tab) => (
        tab.id === activeIdRef.current ? { ...tab, url: parsed.url, title: tabLabel(parsed.url, ''), icon: '' } : tab
      )))
      return { url: parsed.url }
    }
    if (type === 'back') {
      if (hasGuestApi(guest, 'goBack')) guest.goBack()
      else throw new Error('这个嵌页不能后退')
      return { ok: true }
    }
    if (type === 'forward') {
      if (hasGuestApi(guest, 'goForward')) guest.goForward()
      else throw new Error('这个嵌页不能前进')
      return { ok: true }
    }
    if (type === 'reload') {
      if (hasGuestApi(guest, 'reload')) guest.reload()
      else guest.src = guest.src
      setLoading(true)
      return { ok: true }
    }
    if (type === 'snapshot' || type === 'url' || type === 'state') {
      return runInGuest(snapshotScript())
    }
    if (type === 'click') return runInGuest(clickScript(action))
    if (type === 'type') return runInGuest(typeScript(action))
    if (type === 'press') {
      const key = String(action.key ?? 'Enter')
      return runInGuest(`(() => {
        document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true }))
        document.activeElement?.dispatchEvent(new KeyboardEvent('keyup', { key: ${JSON.stringify(key)}, bubbles: true }))
        return true
      })()`)
    }
    if (type === 'devtools') {
      openDevtools()
      return { ok: true }
    }
    if (type === 'console' || type === 'network' || type === 'cdp' || type === 'screenshot') {
      throw new Error('嵌页模式下这个排查口还没接上')
    }
    if (type === 'pointer' || type === 'wheel' || type === 'key' || type === 'resize') return { ok: true }
    throw new Error('不认识这个操作')
  }
  applyRef.current = applyAction
  const closeTabRef = useRef(closeTab)
  closeTabRef.current = closeTab

  const openDevtools = () => {
    const guest = guestRef.current
    const mode = readDevtoolsMode()
    const openDetached = () => {
      if (!hasGuestApi(guest, 'openDevTools')) return false
      try {
        if (hasGuestApi(guest, 'isDevToolsOpened') && guest.isDevToolsOpened()) {
          guest.closeDevTools()
          setError(undefined)
          return true
        }
        guest.openDevTools({ mode: 'detach' })
        setError(undefined)
        return true
      } catch {
        return false
      }
    }
    const fail = () => {
      if (window.dshDesktop) setError('调试区打不开')
      else setError('F12 需要用桌面端打开')
    }
    if (mode !== 'detach') {
      if (dockOpenRef.current) {
        setDockOpen(false)
        return
      }
      setDockOpen(true)
      setError(undefined)
      return
    }
    if (dockOpenRef.current) setDockOpen(false)
    const api = window.dshDesktop
    const wcId = guestWebContentsId(guest)
    if (api && typeof api.openGuestDevtools === 'function' && wcId) {
      void Promise.resolve(api.openGuestDevtools(wcId, 'detach')).then((result) => {
        if (result?.ok) {
          setError(undefined)
          return
        }
        if (!openDetached()) fail()
      }).catch(() => {
        if (!openDetached()) fail()
      })
      return
    }
    if (openDetached()) return
    fail()
  }

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !sessionId) return undefined
    tabSeq = 0
    const firstId = nextTabId()
    setTabs([{ id: firstId, title: '新标签', url: 'about:blank', icon: '' }])
    setActiveId(firstId)
    setDraft('')
    setUrl('about:blank')
    setDownloads([])
    setDlOpen(false)
    setMoreOpen(false)
    setHistoryOpen(false)
    setProxyOpen(false)
    const profiles = loadProxyProfiles()
    const active = loadProxyActive(sessionId, profiles)
    setProxyProfiles(profiles)
    setProxyActive(active)
    void pushProxy(sessionId, active, profiles)
    setVisits(loadVisits(sessionId))
    setDockOpen(false)
    mountGuest(firstId, 'about:blank')
    showTab(firstId)

    let socket
    let closed = false
    const connect = () => {
      if (closed) return
      socket = new WebSocket(socketUrl(sessionId))
      socketRef.current = socket
      socket.onmessage = (event) => {
        let next
        try {
          next = JSON.parse(String(event.data))
        } catch {
          return
        }
        if (next.type === 'error') {
          setError(next.message || '浏览器开不了')
          return
        }
        if (next.type === 'cmd') {
          void applyRef.current(next.action).then((value) => {
            if (socket?.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: 'result', id: next.id, ok: true, value }))
            }
          }).catch((err) => {
            if (socket?.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ type: 'result', id: next.id, ok: false, error: String(err.message ?? err) }))
            }
          })
        }
      }
      socket.onerror = () => {}
    }
    const start = window.requestAnimationFrame(() => connect())

    return () => {
      closed = true
      window.cancelAnimationFrame(start)
      for (const id of [...guestsRef.current.keys()]) dropGuest(id)
      void closeDocked()
      guestRef.current = null
      socketRef.current = null
      try {
        socket?.close()
      } catch {
        // 已经断了
      }
    }
  }, [sessionId, paneId])

  useEffect(() => {
    if (!guestsRef.current.has(activeId)) return
    showTab(activeId)
  }, [activeId])

  useLayoutEffect(() => {
    if (!dockOpen) {
      void closeDocked()
      return undefined
    }
    void attachDocked()
    return undefined
  }, [dockOpen, activeId])

  useEffect(() => {
    if (!dockOpen) return undefined
    const dock = dockRef.current
    if (!dock) return undefined
    const kick = () => pushDockBox()
    kick()
    const obs = new ResizeObserver(() => kick())
    obs.observe(dock)
    if (wrapRef.current) obs.observe(wrapRef.current)
    window.addEventListener('resize', kick)
    window.addEventListener('scroll', kick, true)
    const io = typeof IntersectionObserver === 'function'
      ? new IntersectionObserver(() => kick(), { threshold: [0, 0.05, 0.5, 1] })
      : null
    io?.observe(dock)
    return () => {
      obs.disconnect()
      io?.disconnect()
      window.removeEventListener('resize', kick)
      window.removeEventListener('scroll', kick, true)
    }
  }, [dockOpen, active])

  useEffect(() => {
    const api = window.dshDesktop
    if (!api || typeof api.onDownload !== 'function') return undefined
    return api.onDownload((item) => {
      if (!item?.id) return
      setDownloads((prev) => {
        const rest = prev.filter((row) => row.id !== item.id)
        return [...rest, item]
      })
      setDlOpen(true)
      setMoreOpen(false)
      setHistoryOpen(false)
      setProxyOpen(false)
    })
  }, [])

  useEffect(() => {
    if (!dlOpen && !moreOpen && !historyOpen && !proxyOpen) return undefined
    const onDown = (event) => {
      const inDl = dlWrapRef.current?.contains(event.target)
      const inMore = moreWrapRef.current?.contains(event.target)
      const inProxy = proxyWrapRef.current?.contains(event.target)
      if (!inDl) setDlOpen(false)
      if (!inMore) {
        setMoreOpen(false)
        setHistoryOpen(false)
      }
      if (!inProxy) setProxyOpen(false)
    }
    const onKey = (event) => {
      if (event.key !== 'Escape') return
      setDlOpen(false)
      setMoreOpen(false)
      setHistoryOpen(false)
      setProxyOpen(false)
    }
    document.addEventListener('mousedown', onDown, true)
    window.addEventListener('mousedown', onDown, true)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown, true)
      window.removeEventListener('mousedown', onDown, true)
      window.removeEventListener('keydown', onKey)
    }
  }, [dlOpen, moreOpen, historyOpen, proxyOpen])

  useEffect(() => {
    for (const [id, guest] of guestsRef.current) {
      const on = id === activeId && !popupOpen
      guest.style.pointerEvents = on ? 'auto' : 'none'
    }
  }, [activeId, popupOpen])

  useEffect(() => {
    if (!active) return undefined
    const onKey = (event) => {
      if (!wrapRef.current?.contains(event.target)) return
      if (event.key === 'F12' || (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'i')) {
        event.preventDefault()
        openDevtools()
        return
      }
      if (event.ctrlKey && event.key.toLowerCase() === 't') {
        event.preventDefault()
        addTabRef.current()
        return
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'w') {
        event.preventDefault()
        closeTabRef.current(activeIdRef.current)
        return
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'l') {
        event.preventDefault()
        urlRef.current?.focus()
        urlRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  const go = (target) => {
    editing.current = false
    const parsed = normalizeNavigateUrl(target)
    if (!parsed.ok) {
      setError(parsed.error)
      return
    }
    const guest = guestRef.current
    if (!guest) return
    setError(undefined)
    setLoading(true)
    guest.src = parsed.url
    setUrl(parsed.url)
    setDraft(parsed.url === 'about:blank' ? '' : parsed.url)
    setTabs((prev) => prev.map((tab) => (
      tab.id === activeIdRef.current ? { ...tab, url: parsed.url, title: tabLabel(parsed.url, ''), icon: '' } : tab
    )))
  }

  const back = () => {
    const guest = guestRef.current
    if (hasGuestApi(guest, 'goBack')) guest.goBack()
  }
  const forward = () => {
    const guest = guestRef.current
    if (hasGuestApi(guest, 'goForward')) guest.goForward()
  }
  const reload = () => {
    const guest = guestRef.current
    if (!guest) return
    if (hasGuestApi(guest, 'reload')) guest.reload()
    else guest.src = guest.src
    setLoading(true)
  }

  const hardReload = () => {
    const guest = guestRef.current
    if (!guest) return
    setMoreOpen(false)
    setHistoryOpen(false)
    if (hasGuestApi(guest, 'reloadIgnoringCache')) guest.reloadIgnoringCache()
    else if (hasGuestApi(guest, 'reload')) guest.reload()
    else guest.src = guest.src
    setLoading(true)
  }

  const reloadGuests = () => {
    for (const guest of guestsRef.current.values()) {
      try {
        if (hasGuestApi(guest, 'reloadIgnoringCache')) guest.reloadIgnoringCache()
        else if (hasGuestApi(guest, 'reload')) guest.reload()
        else guest.src = guest.src
      } catch {
        // 这个标签还没挂上
      }
    }
    setLoading(true)
  }

  const chooseProxy = async (id) => {
    if (id === proxyActive) return
    const result = await pushProxy(sessionId, id, proxyProfiles)
    if (!result.ok) {
      setError(result.missing ? '换代理需要桌面端嵌页' : (result.error || '代理设不上，再试一次'))
      return
    }
    setProxyActive(id)
    saveProxyActive(sessionId, id)
    setError(undefined)
  }

  const commitProxy = (profile, edited) => {
    const list = edited
      ? proxyProfiles.map((row) => (row.id === profile.id ? profile : row))
      : [...proxyProfiles, profile].slice(-40)
    setProxyProfiles(list)
    saveProxyProfiles(list)
    if (edited && profile.id === proxyActive) void chooseProxyAfter(profile.id, list)
  }

  const chooseProxyAfter = async (id, list) => {
    const result = await pushProxy(sessionId, id, list)
    if (!result.ok) {
      setError(result.missing ? '换代理需要桌面端嵌页' : (result.error || '代理设不上，再试一次'))
      return
    }
    setProxyActive(id)
    saveProxyActive(sessionId, id)
    setError(undefined)
  }

  const dropProxy = (id) => {
    const list = proxyProfiles.filter((row) => row.id !== id)
    setProxyProfiles(list)
    saveProxyProfiles(list)
    if (proxyActive === id) void chooseProxyAfter(PROXY_SYSTEM, list)
  }

  const clearVisits = () => {
    setVisits([])
    saveVisits(sessionId, [])
  }

  const dropVisit = (url) => {
    setVisits((prev) => {
      const list = forgetVisit(prev, url)
      saveVisits(sessionId, list)
      return list
    })
  }

  const openHistory = () => {
    setDlOpen(false)
    setMoreOpen(false)
    setProxyOpen(false)
    setHistoryOpen(true)
  }

  const openVisit = (target) => {
    setHistoryOpen(false)
    go(target)
  }

  const clearBrowserData = async (kind) => {
    setMoreOpen(false)
    setHistoryOpen(false)
    const api = window.dshDesktop
    if (!api || typeof api.clearBrowserData !== 'function') {
      setError('清数据需要桌面端嵌页')
      return
    }
    try {
      const result = await api.clearBrowserData(partitionName(sessionId), kind)
      if (!result?.ok) {
        setError('清不掉，再试一次')
        return
      }
      setError(undefined)
      if (kind === 'browsing-data') clearVisits()
      reloadGuests()
    } catch {
      setError('清不掉，再试一次')
    }
  }

  const visibleDownloads = downloads.filter((item) => item.state !== 'cancelled' || item.received)
  const desktop = typeof window !== 'undefined' ? window.dshDesktop : undefined

  if (!sessionId) {
    return <div style={S.empty}>这条对话还没有编号，开不了浏览器</div>
  }

  return (
    <div ref={wrapRef} style={S.browserWrap} data-dsh-browser="">
      <div data-dsh-browser-tabs="" style={S.browserTabBar}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            data-dsh-browser-tab=""
            data-dsh-browser-tab-active={tab.id === activeId ? '' : undefined}
            style={{ ...S.browserTab, ...(tab.id === activeId ? S.browserTabActive : {}) }}
            title={tab.url}
            onClick={() => setActiveId(tab.id)}
          >
            <TabFavicon
              icon={tab.icon}
              onBroken={() => setTabs((prev) => prev.map((row) => (
                row.id === tab.id ? { ...row, icon: '' } : row
              )))}
            />
            <span style={S.browserTabName}>{tab.title}</span>
            <button
              type="button"
              style={S.tabClose}
              title="关闭标签"
              aria-label={`关闭 ${tab.title}`}
              onClick={(event) => {
                event.stopPropagation()
                closeTab(tab.id)
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button type="button" style={S.browserTabAdd} title="新标签" aria-label="新标签" onClick={() => addTab()}>
          +
        </button>
      </div>
      <div style={{ ...S.chrome, alignItems: 'center', overflow: 'visible', zIndex: 30 }}>
        <div style={S.chromeGroup}>
          <button type="button" style={S.iconBtn} title="后退" disabled={!canGoBack} onClick={back}>
            <NavIcon d="M10.5 3.5 5.5 8l5 4.5" />
          </button>
          <button type="button" style={S.iconBtn} title="前进" disabled={!canGoForward} onClick={forward}>
            <NavIcon d="M5.5 3.5 10.5 8l-5 4.5" />
          </button>
          <button type="button" style={S.iconBtn} title="刷新" onClick={reload}>
            <NavIcon d="M3 8a5 5 0 0 1 9-2.5 M13 3.5v3h-3 M13 8a5 5 0 0 1-9 2.5 M3 12.5v-3h3" />
          </button>
        </div>
        <form
          style={S.browserUrlForm}
          onSubmit={(event) => {
            event.preventDefault()
            go(draft)
          }}
        >
          <input
            ref={urlRef}
            data-dsh-browser-url=""
            style={S.browserUrl}
            value={draft}
            spellCheck={false}
            placeholder="输入网址"
            onFocus={() => {
              editing.current = true
            }}
            onBlur={() => {
              editing.current = false
              setDraft(url === 'about:blank' ? '' : url)
            }}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                editing.current = false
                setDraft(url === 'about:blank' ? '' : url)
              }
            }}
          />
        </form>
        <div style={S.chromeGroup}>
          <div ref={proxyWrapRef} style={S.browserDlWrap}>
            <button
              type="button"
              data-dsh-browser-proxy=""
              style={{ ...S.iconBtn, position: 'relative', opacity: proxyOpen ? 1 : 0.7 }}
              title="代理"
              aria-label="代理"
              aria-pressed={proxyOpen}
              onClick={() => {
                setDlOpen(false)
                setMoreOpen(false)
                setHistoryOpen(false)
                setProxyOpen((open) => !open)
              }}
            >
              <ProxyGlobeIcon />
              {proxyProfiles.some((row) => row.id === proxyActive) ? <span style={S.browserDlBadge} /> : null}
            </button>
            {proxyOpen ? (
              <BrowserProxyPanel
                activeId={proxyActive}
                profiles={proxyProfiles}
                onSelect={(id) => void chooseProxy(id)}
                onCommit={commitProxy}
                onDelete={dropProxy}
              />
            ) : null}
          </div>
          <div ref={dlWrapRef} style={S.browserDlWrap}>
            <button
              type="button"
              data-dsh-browser-downloads=""
              style={{ ...S.iconBtn, position: 'relative', opacity: dlOpen ? 1 : 0.7 }}
              title="下载"
              aria-label="下载"
              aria-pressed={dlOpen}
              onClick={() => {
                setMoreOpen(false)
                setHistoryOpen(false)
                setProxyOpen(false)
                setDlOpen((open) => !open)
              }}
            >
              <DownloadTrayIcon />
              {downloads.some((item) => item.state === 'progressing') ? <span style={S.browserDlBadge} /> : null}
            </button>
            {dlOpen ? (
              <div style={S.browserDownloads} role="dialog" aria-label="下载">
                {desktop?.openDownloadsFolder ? (
                  <div style={S.browserDlBar}>
                    <button type="button" style={S.browserDlBtn} onClick={() => desktop.openDownloadsFolder()}>
                      打开文件夹
                    </button>
                  </div>
                ) : null}
                {visibleDownloads.length === 0 ? (
                  <div style={S.browserDlEmpty}>还没有下载</div>
                ) : (
                  visibleDownloads.map((item) => (
                    <div key={item.id} style={S.browserDlItem}>
                      <div style={S.browserDlMeta}>
                        <span style={S.browserDlName} title={item.savePath || item.filename}>{item.filename}</span>
                        <span style={S.browserDlPct}>
                          {item.state === 'completed' ? '完成' : item.state === 'interrupted' ? '中断' : `${percent(item)}%`}
                        </span>
                      </div>
                      <div style={S.browserDlTrack}>
                        <div style={{ ...S.browserDlFill, width: `${percent(item)}%` }} />
                      </div>
                      <div style={S.browserDlActions}>
                        {item.state === 'progressing' && desktop?.cancelDownload ? (
                          <button type="button" style={S.browserDlBtn} onClick={() => desktop.cancelDownload(item.id)}>取消</button>
                        ) : null}
                        {item.state === 'completed' && item.savePath && desktop?.openDownload ? (
                          <button type="button" style={S.browserDlBtn} onClick={() => desktop.openDownload(item.savePath)}>打开</button>
                        ) : null}
                        <button
                          type="button"
                          style={S.browserDlBtn}
                          onClick={() => setDownloads((prev) => prev.filter((row) => row.id !== item.id))}
                        >
                          关闭
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
          <button type="button" data-dsh-browser-f12="" style={S.iconBtn} title="F12 调试" aria-label="F12 调试" onClick={openDevtools}>
            <ConsolePromptIcon />
          </button>
          <div ref={moreWrapRef} style={S.browserDlWrap}>
            <button
              type="button"
              data-dsh-browser-more=""
              style={{ ...S.iconBtn, opacity: moreOpen || historyOpen ? 1 : 0.7 }}
              title="更多"
              aria-label="更多"
              aria-pressed={moreOpen || historyOpen}
              onClick={() => {
                setDlOpen(false)
                setProxyOpen(false)
                if (historyOpen) {
                  setHistoryOpen(false)
                  setMoreOpen(false)
                  return
                }
                setHistoryOpen(false)
                setMoreOpen((open) => !open)
              }}
            >
              <MoreDotsIcon />
            </button>
            {moreOpen ? (
              <div style={S.browserMenu} role="menu" aria-label="更多">
                <button type="button" role="menuitem" style={S.browserMenuItem} onClick={hardReload}>
                  强制刷新
                </button>
                <button type="button" role="menuitem" style={S.browserMenuItem} onClick={openHistory}>
                  历史记录
                </button>
                <button type="button" role="menuitem" style={S.browserMenuItem} onClick={() => void clearBrowserData('cookies')}>
                  清除 cookie
                </button>
                <button type="button" role="menuitem" style={S.browserMenuItem} onClick={() => void clearBrowserData('cache')}>
                  清除缓存
                </button>
                <button type="button" role="menuitem" style={S.browserMenuItem} onClick={() => void clearBrowserData('browsing-data')}>
                  清除浏览数据
                </button>
              </div>
            ) : null}
            {historyOpen ? (
              <div style={S.browserHistory} role="dialog" aria-label="历史记录">
                {visits.length > 0 ? (
                  <div style={S.browserDlBar}>
                    <button type="button" style={S.browserDlBtn} onClick={clearVisits}>
                      清空
                    </button>
                  </div>
                ) : null}
                {visits.length === 0 ? (
                  <div style={S.browserDlEmpty}>还没有历史记录</div>
                ) : (
                  visits.map((row) => (
                    <div key={`${row.url}-${row.at}`} style={S.browserHistoryRow}>
                      <button
                        type="button"
                        style={S.browserHistoryItem}
                        title={row.url}
                        onClick={() => openVisit(row.url)}
                      >
                        <span style={S.browserHistoryTitle}>{row.title || historyHost(row.url)}</span>
                        <span style={S.browserHistoryMeta}>
                          <span style={S.browserHistoryHost}>{historyHost(row.url)}</span>
                          <span>{formatVisitTime(row.at)}</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        style={S.tabClose}
                        title="删除这条"
                        aria-label={`删除 ${row.title || historyHost(row.url)}`}
                        onClick={(event) => {
                          event.stopPropagation()
                          dropVisit(row.url)
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <div data-dsh-browser-body="" style={S.browserBody}>
        {popupOpen ? (
          <div
            data-dsh-browser-mask=""
            style={S.browserPopupMask}
            onMouseDown={() => {
              setDlOpen(false)
              setMoreOpen(false)
              setHistoryOpen(false)
              setProxyOpen(false)
            }}
          />
        ) : null}
        <div ref={stageRef} tabIndex={-1} data-dsh-browser-stage="" style={S.browserStage}>
          {loading ? <div style={S.browserLoading} /> : null}
          {error ? <div style={S.browserError}>{error}</div> : null}
        </div>
        {dockOpen ? <div ref={dockRef} data-dsh-browser-dock="" style={S.browserDock} /> : null}
      </div>
    </div>
  )
}

function TabFavicon({ icon, onBroken }) {
  if (!icon) {
    return (
      <span style={S.browserTabIconFallback} aria-hidden="true">
        <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.4">
          <circle cx="8" cy="8" r="5.2" />
          <path d="M2.8 8h10.4 M8 2.8c1.5 1.6 2.2 3.3 2.2 5.2S9.5 11.6 8 13.2C6.5 11.6 5.8 9.9 5.8 8S6.5 4.4 8 2.8z" />
        </svg>
      </span>
    )
  }
  return (
    <img src={icon} alt="" style={S.browserTabIcon} onError={onBroken} />
  )
}

function NavIcon({ d }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
