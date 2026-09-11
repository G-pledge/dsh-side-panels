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
 * @param {{ snapshot: Function, diff: Function, stage: Function, unstage: Function, discard: Function, commit: Function }} [git]
 */
export function registerRoutes(ctx, fs, git) {
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
      const maxBytes = path === '/dsh-side-panels/write'
        ? 70 * 1024 * 1024
        : path === '/dsh-side-panels/git' ? 320 * 1024 : 4096
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
      if (path === '/dsh-side-panels/git') {
        if (!git) {
          sendJson(response, 200, { ok: false, error: { code: 'not-found', message: '没有这条接口' } })
          return
        }
        const action = typeof body?.action === 'string' ? body.action : ''
        const repo = typeof body?.repo === 'string' ? body.repo : ''
        const paths = body?.paths ?? body?.path
        if (action === 'snapshot') {
          sendJson(response, 200, await git.snapshot(root))
          return
        }
        if (action === 'diff') {
          sendJson(response, 200, await git.diff(root, paths, body?.side, body?.untracked === true, repo))
          return
        }
        if (action === 'stage') {
          sendJson(response, 200, await git.stage(root, paths, repo))
          return
        }
        if (action === 'unstage') {
          sendJson(response, 200, await git.unstage(root, paths, repo))
          return
        }
        if (action === 'discard') {
          sendJson(response, 200, await git.discard(root, paths, repo))
          return
        }
        if (action === 'commit') {
          const message = typeof body?.message === 'string' ? body.message : ''
          sendJson(response, 200, await git.commit(root, message, body?.all === true, repo, {
            amend: body?.amend === true,
            push: body?.push === true,
            sync: body?.sync === true,
          }))
          return
        }
        if (action === 'refs') {
          sendJson(response, 200, await git.refs(root, repo))
          return
        }
        if (action === 'checkout') {
          sendJson(response, 200, await git.checkout(root, {
            ref: body?.ref,
            name: body?.name,
            from: body?.from,
            kind: body?.kind,
            repo,
            create: body?.create === true,
            detached: body?.detached === true,
          }))
          return
        }
        if (action === 'graph') {
          sendJson(response, 200, await git.graph(root, repo, {
            all: body?.all !== false,
            limit: body?.limit,
          }))
          return
        }
        if (action === 'commitFiles') {
          sendJson(response, 200, await git.commitFiles(root, repo, body?.hash))
          return
        }
        if (action === 'commitDiff') {
          sendJson(response, 200, await git.commitDiff(root, repo, body?.hash, paths))
          return
        }
        if (action === 'cherryPick') {
          sendJson(response, 200, await git.cherryPick(root, repo, body?.hash))
          return
        }
        if (action === 'revert') {
          sendJson(response, 200, await git.revert(root, repo, body?.hash))
          return
        }
        if (action === 'reset') {
          sendJson(response, 200, await git.reset(root, repo, body?.hash, body?.mode))
          return
        }
        if (action === 'tag') {
          sendJson(response, 200, await git.tag(root, repo, body?.name, body?.hash))
          return
        }
        if (action === 'remote') {
          sendJson(response, 200, await git.remote(root, repo, body?.kind))
          return
        }
        if (action === 'stash') {
          sendJson(response, 200, await git.stash(root, repo, {
            op: body?.op,
            message: body?.message,
            includeUntracked: body?.includeUntracked === true,
            ref: body?.ref,
          }))
          return
        }
        if (action === 'merge') {
          sendJson(response, 200, await git.merge(root, repo, {
            ref: body?.ref,
            abort: body?.abort === true,
            continue: body?.continue === true,
          }))
          return
        }
        if (action === 'rebase') {
          sendJson(response, 200, await git.rebase(root, repo, {
            ref: body?.ref,
            abort: body?.abort === true,
            continue: body?.continue === true,
          }))
          return
        }
        if (action === 'continueOp') {
          sendJson(response, 200, await git.continueOp(root, repo))
          return
        }
        if (action === 'abortOp') {
          sendJson(response, 200, await git.abortOp(root, repo))
          return
        }
        if (action === 'hunk') {
          sendJson(response, 200, await git.hunk(root, repo, paths, body?.op, body?.patch))
          return
        }
        if (action === 'take') {
          sendJson(response, 200, await git.take(root, repo, paths, body?.which))
          return
        }
        if (action === 'ignore') {
          sendJson(response, 200, await git.ignore(root, repo, paths))
          return
        }
        if (action === 'init') {
          sendJson(response, 200, await git.init(root))
          return
        }
        if (action === 'clone') {
          sendJson(response, 200, await git.clone(root, body?.url, body?.name))
          return
        }
        if (action === 'branchOp') {
          sendJson(response, 200, await git.branchOp(root, repo, {
            op: body?.op,
            name: body?.name,
            newName: body?.newName,
            force: body?.force === true,
          }))
          return
        }
        if (action === 'fileLog') {
          sendJson(response, 200, await git.fileLog(root, repo, paths))
          return
        }
        if (action === 'blame') {
          sendJson(response, 200, await git.blame(root, repo, paths))
          return
        }
        if (action === 'compare') {
          sendJson(response, 200, await git.compare(root, repo, body?.a, body?.b))
          return
        }
        if (action === 'compareDiff') {
          sendJson(response, 200, await git.compareDiff(root, repo, body?.a, body?.b, paths))
          return
        }
        if (action === 'submoduleUpdate') {
          sendJson(response, 200, await git.submoduleUpdate(root, repo))
          return
        }
        sendJson(response, 200, { ok: false, error: { code: 'bad-request', message: '不认识这个 git 动作' } })
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
    webServer.register({ kind: 'exact', path: '/dsh-side-panels/git', handler }),
  ]
  return () => {
    for (const dispose of disposers) dispose()
  }
}

export { workspacePaths }
