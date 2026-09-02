import React, { useEffect, useRef } from 'react'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { S } from './styles.js'
import { readTermFont, readTermTheme, watchTermTheme } from './term-theme.js'
import { XTERM_CSS } from './xterm-css.js'

let xtermCssReady = false

function ensureXtermCss() {
  if (xtermCssReady || typeof document === 'undefined') return
  xtermCssReady = true
  if (document.querySelector('style[data-dsh-xterm]')) return
  const style = document.createElement('style')
  style.dataset.dshXterm = ''
  style.textContent = `${XTERM_CSS}
.xterm,.xterm .xterm-screen{width:100%;height:100%}
.xterm .xterm-viewport{background-color:var(--dsw-alias-bg-base,#fff)}
.xterm .composition-view{background:var(--dsw-alias-bg-base,#fff);color:var(--dsw-alias-fg-default,#3c3c3c)}`
  document.head.appendChild(style)
}

function socketUrl(root, cols, rows) {
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  const host = window.location.host || '127.0.0.1'
  const query = new URLSearchParams({
    root: root ?? '',
    cols: String(cols || 80),
    rows: String(rows || 24),
  })
  return `${proto}//${host}/dsh-side-panels/pty?${query}`
}

export function TerminalView({ cwd, paneId, active }) {
  const hostRef = useRef(null)
  const termRef = useRef(null)
  const fitRef = useRef(null)

  useEffect(() => {
    ensureXtermCss()
    const host = hostRef.current
    if (!host || !cwd) return undefined

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: readTermFont(),
      theme: readTermTheme(),
      minimumContrastRatio: 4.5,
      convertEol: false,
      scrollback: 4000,
      windowsPty: /Windows/i.test(navigator.userAgent) ? { backend: 'conpty', buildNumber: 19045 } : undefined,
    })
    const fit = new FitAddon()
    term.loadAddon(fit)
    term.open(host)
    termRef.current = term
    fitRef.current = fit

    let socket
    let closed = false
    const connect = () => {
      if (closed) return
      try {
        fit.fit()
      } catch {
        // 容器还没量到尺寸
      }
      socket = new WebSocket(socketUrl(cwd, term.cols, term.rows))
      socket.onmessage = (event) => {
        let frame
        try {
          frame = JSON.parse(String(event.data))
        } catch {
          return
        }
        if (frame.type === 'output' && typeof frame.data === 'string') term.write(frame.data)
        if (frame.type === 'exit') {
          const detail = frame.error ? ` ${frame.error}` : ''
          term.write(`\r\n[进程已结束${frame.code == null ? '' : ` ${frame.code}`}]${detail}\r\n`)
        }
      }
      socket.onerror = () => {
        if (!closed) term.write('\r\n连不上终端，请重启桌面端后再试。\r\n')
      }
    }
    const start = window.requestAnimationFrame(() => connect())

    const input = term.onData((data) => {
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'input', data }))
      }
    })

    const syncSize = () => {
      if (host.clientWidth < 8 || host.clientHeight < 8) return
      try {
        fit.fit()
      } catch {
        return
      }
      if (socket?.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))
      }
    }
    const observer = typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(() => syncSize())
    observer?.observe(host)
    window.addEventListener('resize', syncSize)
    const stopTheme = watchTermTheme((theme, fontFamily) => {
      term.options.theme = theme
      host.style.backgroundColor = theme.background
      if (host.parentElement) host.parentElement.style.backgroundColor = theme.background
      if (term.options.fontFamily !== fontFamily) {
        term.options.fontFamily = fontFamily
        try {
          fit.fit()
        } catch {
          // 还没铺开
        }
      }
    })

    return () => {
      closed = true
      window.cancelAnimationFrame(start)
      observer?.disconnect()
      stopTheme()
      window.removeEventListener('resize', syncSize)
      input.dispose()
      try {
        socket?.close()
      } catch {
        // 已经断了
      }
      term.dispose()
      termRef.current = null
      fitRef.current = null
    }
  }, [cwd, paneId])

  useEffect(() => {
    if (!active) return undefined
    const id = window.requestAnimationFrame(() => {
      const host = hostRef.current
      if (host && host.clientWidth >= 8 && host.clientHeight >= 8) {
        try {
          fitRef.current?.fit()
        } catch {
          // 还没铺开
        }
      }
      termRef.current?.focus()
    })
    return () => window.cancelAnimationFrame(id)
  }, [active])

  if (!cwd) {
    return <div style={S.empty}>这条对话还没有工作目录，开不了终端</div>
  }

  return (
    <div style={S.termWrap} onMouseDown={() => termRef.current?.focus()}>
      <div ref={hostRef} style={S.termHost} />
    </div>
  )
}
