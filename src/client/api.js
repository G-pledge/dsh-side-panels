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
