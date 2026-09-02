import { WebSocketServer } from 'ws'
import { isLoopbackHost, sameOrigin } from './http.js'
import { openShell } from './pty-session.js'

const terminalWss = new WebSocketServer({ noServer: true })

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

/**
 * @param {*} ctx
 * @param {{ gateRoot: Function }} fs
 * @param {() => { shell?: string, customPath?: string }} [readChoice]
 */
export function registerTerminal(ctx, fs, readChoice) {
  const { webServer } = ctx
  const upgrade = webServer.registerUpgrade({
    path: '/dsh-side-panels/pty',
    handler: (request, socket, head) => {
      if (!isLoopbackHost(request) || (request.headers.origin && !sameOrigin(request))) {
        reject(socket, 403, 'Forbidden')
        return
      }
      const url = queryOf(request)
      const root = url.searchParams.get('root') ?? ''
      const cols = Number.parseInt(url.searchParams.get('cols') ?? '80', 10)
      const rows = Number.parseInt(url.searchParams.get('rows') ?? '24', 10)
      terminalWss.handleUpgrade(request, socket, head, (ws) => {
        let session
        let closed = false
        const closeSession = () => {
          if (closed) return
          closed = true
          session?.kill()
          session = undefined
        }
        void fs.gateRoot(root).then((gated) => {
          if (ws.readyState !== 1) return
          if (!gated.ok) {
            sendFrame(ws, { type: 'exit', code: 1, error: gated.error?.message ?? '工作目录不可用' })
            try {
              ws.close(1008)
            } catch {
              // 已经关了
            }
            return
          }
          return openShell({
            cwd: gated.value,
            cols: Number.isFinite(cols) ? cols : 80,
            rows: Number.isFinite(rows) ? rows : 24,
            choice: typeof readChoice === 'function' ? readChoice() : undefined,
          }).then((opened) => {
            if (ws.readyState !== 1) {
              opened.kill()
              return
            }
            session = opened
            opened.onData((data) => sendFrame(ws, { type: 'output', data }))
            opened.onExit((code) => {
              sendFrame(ws, { type: 'exit', code })
              closed = true
              try {
                ws.close(1000)
              } catch {
                // 已经关了
              }
            })
            sendFrame(ws, { type: 'ready' })
          })
        }).catch((error) => {
          sendFrame(ws, { type: 'exit', code: 1, error: String(error.message ?? error) })
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
          if (frame?.type === 'input' && typeof frame.data === 'string') session?.write(frame.data)
          if (frame?.type === 'resize') {
            session?.resize(Number(frame.cols) || 80, Number(frame.rows) || 24)
          }
        })
        ws.on('close', closeSession)
        ws.on('error', closeSession)
      })
    },
  })
  return () => {
    upgrade()
  }
}
