const TRANSPORT = { code: 'internal', message: '文件接口连不上' }

async function post(path, payload) {
  let response
  try {
    response = await fetch(path, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    })
  } catch {
    return { ok: false, error: TRANSPORT }
  }
  try {
    const envelope = await response.json()
    if (envelope && envelope.ok === true) return envelope
    if (envelope && envelope.ok === false) return envelope
    return { ok: false, error: envelope?.error ?? TRANSPORT }
  } catch {
    return { ok: false, error: TRANSPORT }
  }
}

export const fileApi = {
  list(root, path = '') {
    return post('/dsh-side-panels/list', { root, path })
  },
  read(root, path) {
    return post('/dsh-side-panels/read', { root, path })
  },
  create(root, path, name, directory) {
    return post('/dsh-side-panels/create', { root, path, name, directory })
  },
  status(root) {
    return post('/dsh-side-panels/status', { root })
  },
  rename(root, path, name) {
    return post('/dsh-side-panels/rename', { root, path, name })
  },
  write(root, path, text) {
    return post('/dsh-side-panels/write', { root, path, text })
  },
  async bytes(root, path) {
    let response
    try {
      response = await fetch('/dsh-side-panels/bytes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ root, path }),
      })
    } catch {
      return { ok: false, error: TRANSPORT }
    }
    const type = response.headers.get('content-type') ?? ''
    if (type.includes('application/json')) {
      try {
        const envelope = await response.json()
        if (envelope && envelope.ok === false) return envelope
        return { ok: false, error: envelope?.error ?? TRANSPORT }
      } catch {
        return { ok: false, error: TRANSPORT }
      }
    }
    try {
      const buffer = await response.arrayBuffer()
      return {
        ok: true,
        value: {
          buffer,
          mime: type || 'application/octet-stream',
          truncated: response.headers.get('x-dsh-truncated') === '1',
          size: Number(response.headers.get('x-dsh-size') || buffer.byteLength),
          loaded: Number(response.headers.get('x-dsh-loaded') || buffer.byteLength),
        },
      }
    } catch {
      return { ok: false, error: TRANSPORT }
    }
  },
}

export const gitApi = {
  snapshot(root) {
    return post('/dsh-side-panels/git', { root, action: 'snapshot' })
  },
  diff(root, path, side, untracked, repo) {
    return post('/dsh-side-panels/git', { root, action: 'diff', path, side, untracked: untracked === true, repo: repo || '' })
  },
  stage(root, paths, repo) {
    return post('/dsh-side-panels/git', { root, action: 'stage', paths, repo: repo || '' })
  },
  unstage(root, paths, repo) {
    return post('/dsh-side-panels/git', { root, action: 'unstage', paths, repo: repo || '' })
  },
  discard(root, paths, repo) {
    return post('/dsh-side-panels/git', { root, action: 'discard', paths, repo: repo || '' })
  },
  commit(root, message, all, repo, extra) {
    return post('/dsh-side-panels/git', {
      root,
      action: 'commit',
      message,
      all: all === true,
      repo: repo || '',
      amend: extra?.amend === true,
      push: extra?.push === true,
      sync: extra?.sync === true,
    })
  },
  refs(root, repo) {
    return post('/dsh-side-panels/git', { root, action: 'refs', repo: repo || '' })
  },
  checkout(root, payload) {
    return post('/dsh-side-panels/git', { root, action: 'checkout', ...payload, repo: payload?.repo || '' })
  },
  graph(root, repo, all, limit) {
    return post('/dsh-side-panels/git', { root, action: 'graph', repo: repo || '', all: all !== false, limit })
  },
  commitFiles(root, repo, hash) {
    return post('/dsh-side-panels/git', { root, action: 'commitFiles', repo: repo || '', hash })
  },
  commitDiff(root, repo, hash, path) {
    return post('/dsh-side-panels/git', { root, action: 'commitDiff', repo: repo || '', hash, path })
  },
  cherryPick(root, repo, hash) {
    return post('/dsh-side-panels/git', { root, action: 'cherryPick', repo: repo || '', hash })
  },
  revert(root, repo, hash) {
    return post('/dsh-side-panels/git', { root, action: 'revert', repo: repo || '', hash })
  },
  reset(root, repo, hash, mode) {
    return post('/dsh-side-panels/git', { root, action: 'reset', repo: repo || '', hash, mode })
  },
  tag(root, repo, name, hash) {
    return post('/dsh-side-panels/git', { root, action: 'tag', repo: repo || '', name, hash })
  },
  remote(root, repo, kind) {
    return post('/dsh-side-panels/git', { root, action: 'remote', repo: repo || '', kind })
  },
  stash(root, repo, options) {
    return post('/dsh-side-panels/git', { root, action: 'stash', repo: repo || '', ...options })
  },
  merge(root, repo, options) {
    return post('/dsh-side-panels/git', { root, action: 'merge', repo: repo || '', ...options })
  },
  rebase(root, repo, options) {
    return post('/dsh-side-panels/git', { root, action: 'rebase', repo: repo || '', ...options })
  },
  continueOp(root, repo) {
    return post('/dsh-side-panels/git', { root, action: 'continueOp', repo: repo || '' })
  },
  abortOp(root, repo) {
    return post('/dsh-side-panels/git', { root, action: 'abortOp', repo: repo || '' })
  },
  hunk(root, repo, path, op, patch) {
    return post('/dsh-side-panels/git', { root, action: 'hunk', repo: repo || '', path, op, patch })
  },
  take(root, repo, path, which) {
    return post('/dsh-side-panels/git', { root, action: 'take', repo: repo || '', path, which })
  },
  ignore(root, repo, path) {
    return post('/dsh-side-panels/git', { root, action: 'ignore', repo: repo || '', path })
  },
  init(root) {
    return post('/dsh-side-panels/git', { root, action: 'init' })
  },
  clone(root, url, name) {
    return post('/dsh-side-panels/git', { root, action: 'clone', url, name })
  },
  branchOp(root, repo, options) {
    return post('/dsh-side-panels/git', { root, action: 'branchOp', repo: repo || '', ...options })
  },
  fileLog(root, repo, path) {
    return post('/dsh-side-panels/git', { root, action: 'fileLog', repo: repo || '', path })
  },
  blame(root, repo, path) {
    return post('/dsh-side-panels/git', { root, action: 'blame', repo: repo || '', path })
  },
  compare(root, repo, a, b) {
    return post('/dsh-side-panels/git', { root, action: 'compare', repo: repo || '', a, b })
  },
  compareDiff(root, repo, a, b, path) {
    return post('/dsh-side-panels/git', { root, action: 'compareDiff', repo: repo || '', a, b, path })
  },
  submoduleUpdate(root, repo) {
    return post('/dsh-side-panels/git', { root, action: 'submoduleUpdate', repo: repo || '' })
  },
}
