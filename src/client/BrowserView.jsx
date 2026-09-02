import React, { useEffect, useRef, useState } from 'react'
import { S } from './styles.js'

function socketUrl(session, width, height) {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host || '127.0.0.1'
  const query = new URLSearchParams({
    session: session ?? '',
    width: String(width || 900),
    height: String(height || 640),
  })
  return `${proto}//${host}/dsh-side-panels/browser?${query}`
}

function pointIn(node, event) {
  const box = node.getBoundingClientRect()
  if (box.width < 8 || box.height < 8) return { x: 0, y: 0 }
  return {
    x: Math.max(0, (event.clientX - box.left) * (node.clientWidth / box.width)),
    y: Math.max(0, (event.clientY - box.top) * (node.clientHeight / box.height)),
  }
}

export function BrowserView({ sessionId, paneId, active }) {
  const stageRef = useRef(null)
  const socketRef = useRef(null)
  const urlRef = useRef(null)
  const [draft, setDraft] = useState('')
  const [url, setUrl] = useState('about:blank')
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const [loading, setLoading] = useState(false)
  const [frame, setFrame] = useState()
  const [error, setError] = useState()
  const editing = useRef(false)

  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !sessionId) return undefined
    let closed = false
    let socket

    const send = (payload) => {
      if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload))
    }

    const measure = () => ({
      width: Math.max(320, stage.clientWidth || 900),
      height: Math.max(240, stage.clientHeight || 640),
    })

    const connect = () => {
      if (closed) return
      const size = measure()
      socket = new WebSocket(socketUrl(sessionId, size.width, size.height))
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
        if (next.type === 'frame' && typeof next.data === 'string') {
          setFrame(`data:image/jpeg;base64,${next.data}`)
          setError(undefined)
        }
        if (next.type === 'state' || next.type === 'ready') {
          if (typeof next.url === 'string') {
            setUrl(next.url)
            if (!editing.current) setDraft(next.url === 'about:blank' ? '' : next.url)
          }
          if (typeof next.canGoBack === 'boolean') setCanGoBack(next.canGoBack)
          if (typeof next.canGoForward === 'boolean') setCanGoForward(next.canGoForward)
          if (typeof next.loading === 'boolean') setLoading(next.loading)
        }
      }
      socket.onerror = () => {
        if (!closed) setError('连不上浏览器，请重启桌面端后再试。')
      }
      socket.onopen = () => {
        send({ type: 'resize', ...measure() })
      }
    }

    const start = window.requestAnimationFrame(() => connect())
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => {
      send({ type: 'resize', ...measure() })
    })
    observer?.observe(stage)
    const onWheel = (event) => {
      event.preventDefault()
      send({ type: 'wheel', dx: event.deltaX, dy: event.deltaY })
    }
    stage.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      closed = true
      window.cancelAnimationFrame(start)
      observer?.disconnect()
      stage.removeEventListener('wheel', onWheel)
      socketRef.current = null
      try {
        socket?.close()
      } catch {
        // 已经断了
      }
    }
  }, [sessionId, paneId])

  useEffect(() => {
    if (!active) return undefined
    const id = window.requestAnimationFrame(() => {
      const stage = stageRef.current
      if (!stage) return
      const socket = socketRef.current
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'resize',
          width: Math.max(320, stage.clientWidth || 900),
          height: Math.max(240, stage.clientHeight || 640),
        }))
      }
      stage.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [active])

  const send = (payload) => {
    const socket = socketRef.current
    if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(payload))
  }

  const go = (target) => {
    editing.current = false
    send({ type: 'navigate', url: target })
  }

  const onPointer = (event, kind) => {
    const stage = stageRef.current
    if (!stage) return
    if (kind !== 'move') {
      event.preventDefault()
      stage.focus()
    }
    const point = pointIn(stage, event)
    send({
      type: 'pointer',
      event: kind,
      x: point.x,
      y: point.y,
      button: event.button,
      clickCount: event.detail || 1,
    })
  }

  if (!sessionId) {
    return <div style={S.empty}>这条对话还没有编号，开不了浏览器</div>
  }

  return (
    <div style={S.browserWrap}>
      <div style={S.chrome}>
        <div style={S.chromeGroup}>
          <button type="button" style={S.iconBtn} title="后退" disabled={!canGoBack} onClick={() => send({ type: 'back' })}>
            <NavIcon d="M10.5 3.5 5.5 8l5 4.5" />
          </button>
          <button type="button" style={S.iconBtn} title="前进" disabled={!canGoForward} onClick={() => send({ type: 'forward' })}>
            <NavIcon d="M5.5 3.5 10.5 8l-5 4.5" />
          </button>
          <button type="button" style={S.iconBtn} title="刷新" onClick={() => send({ type: 'reload' })}>
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
                stageRef.current?.focus()
              }
            }}
          />
        </form>
      </div>
      <div
        ref={stageRef}
        tabIndex={0}
        data-dsh-browser-stage=""
        style={S.browserStage}
        onPointerDown={(event) => {
          event.currentTarget.setPointerCapture?.(event.pointerId)
          onPointer(event, 'down')
        }}
        onPointerMove={(event) => {
          if (event.buttons) onPointer(event, 'move')
        }}
        onPointerUp={(event) => onPointer(event, 'up')}
        onContextMenu={(event) => event.preventDefault()}
        onKeyDown={(event) => {
          if (event.target !== stageRef.current) return
          if (event.ctrlKey && event.key.toLowerCase() === 'l') {
            event.preventDefault()
            urlRef.current?.focus()
            urlRef.current?.select()
            return
          }
          event.preventDefault()
          send({
            type: 'key',
            event: 'down',
            key: event.key,
            code: event.code,
          })
        }}
        onKeyUp={(event) => {
          if (event.target !== stageRef.current) return
          event.preventDefault()
          send({ type: 'key', event: 'up', key: event.key, code: event.code })
        }}
      >
        {frame ? (
          <img alt="" draggable={false} src={frame} style={S.browserFrame} />
        ) : (
          <div style={S.empty}>{loading ? '正在打开…' : '输入网址后回车'}</div>
        )}
        {error ? <div style={S.browserError}>{error}</div> : null}
      </div>
    </div>
  )
}

function NavIcon({ d }) {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
