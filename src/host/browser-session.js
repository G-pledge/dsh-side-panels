function send(ws, frame) {
  if (ws.readyState !== 1) return
  try {
    ws.send(JSON.stringify(frame))
  } catch {
    // 对端已经走了
  }
}

export function createBrowserHub() {
  const rooms = new Map()

  const roomOf = (sessionId) => {
    const id = String(sessionId ?? '').trim()
    if (!id) throw new Error('没有对话')
    let room = rooms.get(id)
    if (!room) {
      room = { sockets: new Set(), pending: new Map() }
      rooms.set(id, room)
    }
    return room
  }

  const apply = (sessionId, action) => {
    const room = roomOf(sessionId)
    const live = [...room.sockets].filter((socket) => socket.readyState === 1)
    if (live.length === 0) return Promise.reject(new Error('先打开浏览器面板'))
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        room.pending.delete(id)
        reject(new Error('浏览器没响应'))
      }, 30000)
      room.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer)
          resolve(value)
        },
        reject: (error) => {
          clearTimeout(timer)
          reject(error)
        },
      })
      for (const socket of live) send(socket, { type: 'cmd', id, action })
    })
  }

  const attach = (sessionId, ws) => {
    const room = roomOf(sessionId)
    room.sockets.add(ws)
    const onMessage = (raw) => {
      let frame
      try {
        frame = JSON.parse(String(raw))
      } catch {
        return
      }
      if (frame?.type !== 'result' || typeof frame.id !== 'string') return
      const pending = room.pending.get(frame.id)
      if (!pending) return
      room.pending.delete(frame.id)
      if (frame.ok === false) pending.reject(new Error(frame.error || '失败'))
      else pending.resolve(frame.value)
    }
    ws.on('message', onMessage)
    send(ws, { type: 'ready', mode: 'embed' })
    return () => {
      ws.off('message', onMessage)
      room.sockets.delete(ws)
    }
  }

  return {
    get: async (sessionId) => ({
      apply: (action) => apply(sessionId, action),
      attach: (ws) => attach(sessionId, ws),
    }),
    closeAll() {
      rooms.clear()
    },
  }
}
