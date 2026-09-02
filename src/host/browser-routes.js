import { WebSocketServer } from 'ws'
import { isLoopbackHost, readJsonBody, sameOrigin, sendJson } from './http.js'
import { createBrowserHub } from './browser-session.js'

const browserWss = new WebSocketServer({ noServer: true })

function queryOf(request) {
  try {
    return new URL(request.url ?? '/', 'http://dsh.local')
  } catch {
    return new URL('http://dsh.local/')
  }
}

function reject(socket, status, message) {
  socket.write(`HTTP/1.1 ${status} ${message}\r\nConnection: close\r\n\r\n`)
  socket.destroy()
}

function sendFrame(ws, frame) {
  if (ws.readyState !== 1) return
  try {
    ws.send(JSON.stringify(frame))
  } catch {
    // 连接已经断了
  }
}

function allowHttp(request) {
  if (!isLoopbackHost(request)) return false
  if (request.headers.origin && !sameOrigin(request)) return false
  return true
}

export function registerBrowser(ctx) {
  const { webServer } = ctx
  const hub = createBrowserHub()

  const act = async (request, response) => {
    if (request.method !== 'POST') {
      response.writeHead(405, { allow: 'POST' })
      response.end()
      return
    }
    if (!allowHttp(request)) {
      sendJson(response, 403, { ok: false, error: { code: 'forbidden', message: '拒绝跨源请求' } })
      return
    }
    let body
    try {
      body = await readJsonBody(request, 2 * 1024 * 1024)
    } catch {
      sendJson(response, 400, { ok: false, error: { code: 'bad-request', message: '请求内容无效' } })
      return
    }
    const session = typeof body?.session === 'string' ? body.session.trim() : ''
    if (!session) {
      sendJson(response, 400, { ok: false, error: { code: 'bad-request', message: '缺少对话' } })
      return
    }
    try {
      const runtime = await hub.get(session, { width: body.width, height: body.height })
      const value = await runtime.apply({ ...body, type: body.type ?? body.action })
      sendJson(response, 200, { ok: true, value })
    } catch (error) {
      sendJson(response, 200, { ok: false, error: { code: 'browser', message: String(error.message ?? error) } })
    }
  }

  const upgrade = webServer.registerUpgrade({
    path: '/dsh-side-panels/browser',
    handler: (request, socket, head) => {
      if (!isLoopbackHost(request) || (request.headers.origin && !sameOrigin(request))) {
        reject(socket, 403, 'Forbidden')
        return
      }
      const url = queryOf(request)
      const session = url.searchParams.get('session') ?? ''
      const width = Number.parseInt(url.searchParams.get('width') ?? '900', 10)
      const height = Number.parseInt(url.searchParams.get('height') ?? '640', 10)
      if (!session.trim()) {
        reject(socket, 400, 'Bad Request')
        return
      }
      browserWss.handleUpgrade(request, socket, head, (ws) => {
        let detach = () => {}
        void hub.get(session, { width, height }).then((runtime) => {
          if (ws.readyState !== 1) return
          detach = runtime.attach(ws)
          sendFrame(ws, { type: 'ready' })
        }).catch((error) => {
          sendFrame(ws, { type: 'error', message: String(error.message ?? error) })
          try {
            ws.close(1011)
          } catch {
            // 已经关了
          }
        })
        ws.on('message', (raw) => {
          let frame
          try {
            frame = JSON.parse(String(raw))
          } catch {
            return
          }
          void hub.get(session, { width, height }).then((runtime) => runtime.apply(frame)).catch((error) => {
            sendFrame(ws, { type: 'error', message: String(error.message ?? error) })
          })
        })
        ws.on('close', () => detach())
        ws.on('error', () => detach())
      })
    },
  })

  const route = webServer.register({
    kind: 'exact',
    path: '/dsh-side-panels/browser/act',
    handler: act,
  })

  return () => {
    upgrade()
    route()
    void hub.closeAll()
  }
}
