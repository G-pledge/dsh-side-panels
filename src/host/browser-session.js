import { mkdirSync } from 'node:fs'
import { findChrome, normalizeNavigateUrl, profileDir } from './browser-chrome.js'

const IDLE_MS = 3 * 60 * 1000
const CONSOLE_LIMIT = 80
const NETWORK_LIMIT = 60

function sizeOf(width, height) {
  const nextWidth = Math.min(1920, Math.max(320, Math.round(Number(width) || 900)))
  const nextHeight = Math.min(1200, Math.max(240, Math.round(Number(height) || 640)))
  return { width: nextWidth, height: nextHeight }
}

function playwrightKey(key) {
  if (key === ' ') return 'Space'
  if (key === 'OS' || key === 'Meta') return 'Meta'
  return key
}

function flattenCdpAx(result) {
  const nodes = result?.nodes
  if (!Array.isArray(nodes) || nodes.length === 0) return []
  const byId = new Map(nodes.map((node) => [node.nodeId, node]))
  const lines = []
  const walk = (node, depth) => {
    if (!node || lines.length >= 400) return
    const role = node.role?.value || node.role || 'generic'
    const name = String(node.name?.value ?? node.name ?? '').trim()
    const interesting = role !== 'generic' && role !== 'InlineTextBox' && role !== 'none' && role !== 'ignore'
    if (interesting || name) lines.push(`${'  '.repeat(depth)}${role}${name ? `: ${name}` : ''}`)
    for (const id of node.childIds ?? []) walk(byId.get(id), interesting || name ? depth + 1 : depth)
  }
  walk(nodes[0], 0)
  return lines
}

function pushCap(list, item, limit) {
  list.push(item)
  if (list.length > limit) list.splice(0, list.length - limit)
}

export function createBrowserHub() {
  const runtimes = new Map()
  const pending = new Map()

  const get = async (sessionId, measure) => {
    const id = String(sessionId ?? '').trim()
    if (!id) throw new Error('没有对话')
    if (runtimes.has(id)) {
      const current = runtimes.get(id)
      current.touch()
      return current
    }
    if (pending.has(id)) return pending.get(id)
    const job = openRuntime(id, measure).then((runtime) => {
      runtimes.set(id, runtime)
      runtime.onClosed = () => {
        if (runtimes.get(id) === runtime) runtimes.delete(id)
      }
      return runtime
    }).finally(() => {
      pending.delete(id)
    })
    pending.set(id, job)
    return job
  }

  return {
    get,
    async closeAll() {
      const all = [...runtimes.values()]
      runtimes.clear()
      pending.clear()
      await Promise.all(all.map((item) => item.close()))
    },
  }
}

async function loadPlaywright() {
  try {
    return await import('playwright-core')
  } catch {
    throw new Error('缺少浏览器组件，请重新安装插件')
  }
}

async function openRuntime(sessionId, measure) {
  const chrome = findChrome()
  if (!chrome) throw new Error('本机没找到 Chrome 或 Edge，装好后再开浏览器')
  const { chromium } = await loadPlaywright()
  const dir = profileDir(sessionId)
  mkdirSync(dir, { recursive: true })
  const view = sizeOf(measure?.width, measure?.height)
  const context = await chromium.launchPersistentContext(dir, {
    executablePath: chrome,
    headless: true,
    viewport: view,
    ignoreHTTPSErrors: false,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-session-crashed-bubble',
      '--hide-crash-restore-bubble',
    ],
  })
  const page = context.pages()[0] ?? await context.newPage()
  await page.setViewportSize(view)
  const cdp = await context.newCDPSession(page)
  await cdp.send('Page.enable').catch(() => {})
  await cdp.send('Runtime.enable').catch(() => {})
  await cdp.send('Network.enable').catch(() => {})
  await cdp.send('Console.enable').catch(() => {})

  const clients = new Set()
  const consoleLog = []
  const networkLog = []
  let closed = false
  let idleTimer
  let screencastOn = false
  let onClosed = () => {}

  const emit = (frame) => {
    const text = JSON.stringify(frame)
    for (const socket of clients) {
      if (socket.readyState === 1) {
        try {
          socket.send(text)
        } catch {
          // 对端已经走了
        }
      }
    }
  }

  const touch = () => {
    if (idleTimer) clearTimeout(idleTimer)
    if (clients.size > 0) return
    idleTimer = setTimeout(() => {
      void close()
    }, IDLE_MS)
  }

  const navState = async () => {
    let history = { currentIndex: 0, entries: [] }
    try {
      history = await cdp.send('Page.getNavigationHistory')
    } catch {
      // 有的页拿不到历史
    }
    const index = Number(history.currentIndex) || 0
    const entries = Array.isArray(history.entries) ? history.entries : []
    return {
      url: page.url(),
      title: await page.title().catch(() => ''),
      canGoBack: index > 0,
      canGoForward: index < entries.length - 1,
      loading: false,
    }
  }

  const sendState = async (extra = {}) => {
    const state = { ...(await navState()), ...extra }
    emit({ type: 'state', ...state })
    return state
  }

  page.on('console', (message) => {
    pushCap(consoleLog, {
      type: message.type(),
      text: message.text(),
      time: Date.now(),
    }, CONSOLE_LIMIT)
  })
  page.on('pageerror', (error) => {
    pushCap(consoleLog, {
      type: 'error',
      text: String(error?.message ?? error),
      time: Date.now(),
    }, CONSOLE_LIMIT)
  })
  page.on('request', (request) => {
    pushCap(networkLog, {
      kind: 'request',
      method: request.method(),
      url: request.url(),
      time: Date.now(),
    }, NETWORK_LIMIT)
  })
  page.on('response', (response) => {
    pushCap(networkLog, {
      kind: 'response',
      status: response.status(),
      url: response.url(),
      time: Date.now(),
    }, NETWORK_LIMIT)
  })
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) void sendState({ loading: false })
  })
  page.on('load', () => {
    void sendState({ loading: false })
  })

  cdp.on('Page.screencastFrame', (event) => {
    emit({
      type: 'frame',
      data: event.data,
      width: event.metadata?.deviceWidth,
      height: event.metadata?.deviceHeight,
    })
    cdp.send('Page.screencastFrameAck', { sessionId: event.sessionId }).catch(() => {})
  })

  const startScreencast = async () => {
    if (screencastOn || closed) return
    await cdp.send('Page.startScreencast', {
      format: 'jpeg',
      quality: 55,
      everyNthFrame: 1,
    })
    screencastOn = true
  }

  const stopScreencast = async () => {
    if (!screencastOn) return
    screencastOn = false
    await cdp.send('Page.stopScreencast').catch(() => {})
  }

  const close = async () => {
    if (closed) return
    closed = true
    if (idleTimer) clearTimeout(idleTimer)
    clients.clear()
    await stopScreencast()
    try {
      await context.close()
    } catch {
      // 已经关了
    }
    onClosed()
  }

  const apply = async (action) => {
    if (closed) throw new Error('浏览器已经关掉')
    touch()
    const type = action?.type ?? action?.action
    if (!type) return { ok: true }
    if (type === 'navigate') {
      const parsed = normalizeNavigateUrl(action.url)
      if (!parsed.ok) throw new Error(parsed.error)
      emit({ type: 'state', ...(await navState()), loading: true, url: parsed.url })
      await page.goto(parsed.url, { waitUntil: 'domcontentloaded', timeout: 30000 })
      return sendState()
    }
    if (type === 'back') {
      await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null)
      return sendState()
    }
    if (type === 'forward') {
      await page.goForward({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => null)
      return sendState()
    }
    if (type === 'reload') {
      emit({ type: 'state', ...(await navState()), loading: true })
      await page.reload({ waitUntil: 'domcontentloaded', timeout: 30000 })
      return sendState()
    }
    if (type === 'resize') {
      const next = sizeOf(action.width, action.height)
      await page.setViewportSize(next)
      return { ok: true, ...next }
    }
    if (type === 'pointer') {
      const x = Number(action.x) || 0
      const y = Number(action.y) || 0
      const button = action.button === 2 ? 'right' : action.button === 1 ? 'middle' : 'left'
      if (action.event === 'move') await page.mouse.move(x, y)
      if (action.event === 'down') {
        await page.mouse.move(x, y)
        await page.mouse.down({ button, clickCount: Number(action.clickCount) || 1 })
      }
      if (action.event === 'up') {
        await page.mouse.move(x, y)
        await page.mouse.up({ button, clickCount: Number(action.clickCount) || 1 })
      }
      return { ok: true }
    }
    if (type === 'wheel') {
      await page.mouse.wheel(Number(action.dx) || 0, Number(action.dy) || 0)
      return { ok: true }
    }
    if (type === 'key') {
      const key = playwrightKey(String(action.key ?? ''))
      if (!key) return { ok: true }
      if (action.event === 'up') await page.keyboard.up(key).catch(() => {})
      else await page.keyboard.down(key).catch(() => {})
      return { ok: true }
    }
    if (type === 'click') {
      if (action.ref) await page.locator(`aria-ref=${String(action.ref).replace(/^ref=/, '')}`).click({ timeout: 8000 })
      else if (action.selector) await page.click(String(action.selector), { timeout: 8000 })
      else {
        await page.mouse.click(Number(action.x) || 0, Number(action.y) || 0, {
          button: action.button === 2 ? 'right' : 'left',
          clickCount: Number(action.clickCount) || 1,
        })
      }
      return sendState()
    }
    if (type === 'type') {
      if (action.ref) await page.locator(`aria-ref=${String(action.ref).replace(/^ref=/, '')}`).fill(String(action.text ?? ''))
      else if (action.selector) await page.fill(String(action.selector), String(action.text ?? ''))
      else await page.keyboard.type(String(action.text ?? ''), { delay: 12 })
      return { ok: true }
    }
    if (type === 'press') {
      await page.keyboard.press(playwrightKey(String(action.key ?? 'Enter')))
      return { ok: true }
    }
    if (type === 'snapshot') {
      let text = ''
      try {
        text = await page.ariaSnapshot({ mode: 'ai' })
      } catch {
        await cdp.send('Accessibility.enable').catch(() => {})
        const tree = await cdp.send('Accessibility.getFullAXTree').catch(() => null)
        text = flattenCdpAx(tree).join('\n')
      }
      return {
        url: page.url(),
        title: await page.title().catch(() => ''),
        text: String(text ?? ''),
      }
    }
    if (type === 'screenshot') {
      const bytes = await page.screenshot({ type: 'jpeg', quality: 50 })
      return { data: bytes.toString('base64'), mime: 'image/jpeg' }
    }
    if (type === 'console') {
      return { items: consoleLog.slice(-CONSOLE_LIMIT) }
    }
    if (type === 'network') {
      return { items: networkLog.slice(-NETWORK_LIMIT) }
    }
    if (type === 'url' || type === 'state') {
      return navState()
    }
    if (type === 'cdp') {
      const method = String(action.method ?? '')
      if (!method) throw new Error('缺少调试方法')
      const params = action.params && typeof action.params === 'object' ? action.params : {}
      return cdp.send(method, params)
    }
    throw new Error('不认识这个操作')
  }

  const attach = (socket) => {
    clients.add(socket)
    if (idleTimer) clearTimeout(idleTimer)
    void startScreencast().catch((error) => {
      emit({ type: 'error', message: String(error.message ?? error) })
    })
    void sendState()
    return () => {
      clients.delete(socket)
      if (clients.size === 0) {
        void stopScreencast()
        touch()
      }
    }
  }

  const runtime = {
    sessionId,
    page,
    cdp,
    apply,
    attach,
    touch,
    close,
    get onClosed() {
      return onClosed
    },
    set onClosed(fn) {
      onClosed = typeof fn === 'function' ? fn : () => {}
    },
  }
  touch()
  return runtime
}
