import { readJsonBody, sameOrigin, sendJson } from './http.js'

function workspacePaths(ctx) {
  const registry = ctx.workspaceRegistry
  if (registry === undefined || typeof registry.list !== 'function') return []
  return registry.list()
    .map((item) => item?.path ?? item?.root)
    .filter((path) => typeof path === 'string' && path !== '')
}

function routeOf(url) {
  try {
    return new URL(url ?? '/', 'http://dsh.local').pathname
  } catch {
    return ''
  }
}

/**
 * @param {*} ctx
 * @param {{ list: Function, read: Function, create: Function, rename: Function, write: Function, bytes: Function }} fs
 */
export function registerRoutes(ctx, fs) {
  const { webServer } = ctx

  const handler = async (request, response) => {
    if (request.method !== 'POST') {
      response.writeHead(405, { allow: 'POST' })
      response.end()
      return
    }
    if (!sameOrigin(request)) {
      sendJson(response, 403, { ok: false, error: { code: 'forbidden', message: '拒绝跨源请求' } })
      return
    }

    const path = routeOf(request.url)
    let body
    try {
      const maxBytes = path === '/dsh-side-panels/write' ? 70 * 1024 * 1024 : 4096
      body = await readJsonBody(request, maxBytes)
    } catch {
      sendJson(response, 400, { ok: false, error: { code: 'bad-request', message: '请求内容无效' } })
      return
    }
    const root = typeof body?.root === 'string' ? body.root : ''
    const rel = typeof body?.path === 'string' ? body.path : ''

    try {
      if (path === '/dsh-side-panels/list') {
        sendJson(response, 200, await fs.list(root, rel))
        return
      }
      if (path === '/dsh-side-panels/read') {
        sendJson(response, 200, await fs.read(root, rel))
        return
      }
      if (path === '/dsh-side-panels/create') {
        const name = typeof body?.name === 'string' ? body.name : ''
        const directory = body?.directory === true
        sendJson(response, 200, await fs.create(root, rel, name, directory))
        return
      }
      if (path === '/dsh-side-panels/status') {
        sendJson(response, 200, await fs.status(root))
        return
      }
      if (path === '/dsh-side-panels/rename') {
        const name = typeof body?.name === 'string' ? body.name : ''
        sendJson(response, 200, await fs.rename(root, rel, name))
        return
      }
      if (path === '/dsh-side-panels/write') {
        const text = typeof body?.text === 'string' ? body.text : null
        sendJson(response, 200, await fs.write(root, rel, text))
        return
      }
      if (path === '/dsh-side-panels/bytes') {
        const result = await fs.bytes(root, rel)
        if (!result.ok) {
          sendJson(response, 200, result)
          return
        }
        response.writeHead(200, {
          'cache-control': 'no-store',
          'content-type': result.value.mime || 'application/octet-stream',
          'x-dsh-truncated': result.value.truncated ? '1' : '0',
          'x-dsh-size': String(result.value.size),
          'x-dsh-loaded': String(result.value.loaded),
        })
        response.end(result.value.bytes)
        return
      }
      sendJson(response, 404, { ok: false, error: { code: 'not-found', message: '没有这条接口' } })
    } catch (error) {
      sendJson(response, 500, { ok: false, error: { code: 'io', message: String(error.message ?? error) } })
    }
  }

  const disposers = [
    webServer.register({ kind: 'exact', path: '/dsh-side-panels/list', handler }),
    webServer.register({ kind: 'exact', path: '/dsh-side-panels/read', handler }),
    webServer.register({ kind: 'exact', path: '/dsh-side-panels/create', handler }),
    webServer.register({ kind: 'exact', path: '/dsh-side-panels/status', handler }),
    webServer.register({ kind: 'exact', path: '/dsh-side-panels/rename', handler }),
    webServer.register({ kind: 'exact', path: '/dsh-side-panels/write', handler }),
    webServer.register({ kind: 'exact', path: '/dsh-side-panels/bytes', handler }),
  ]
  return () => {
    for (const dispose of disposers) dispose()
  }
}

export { workspacePaths }
