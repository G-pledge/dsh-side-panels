import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { FileKindIcon } from './icons.jsx'
import { S } from './styles.js'

function DotsIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true">
      <circle cx="3.5" cy="8" r="1.1" />
      <circle cx="8" cy="8" r="1.1" />
      <circle cx="12.5" cy="8" r="1.1" />
    </svg>
  )
}

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M11.4 2.6 13.4 4.6 5.8 12.2 3.5 12.5l.3-2.3z" />
      <path d="M10.2 3.8 12.2 5.8" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <rect x="5.5" y="5.5" width="7" height="8" rx="1" />
      <path d="M10.5 5.5V4.2A1.2 1.2 0 0 0 9.3 3H3.7A1.2 1.2 0 0 0 2.5 4.2v7.6A1.2 1.2 0 0 0 3.7 13h1.8" />
    </svg>
  )
}

function RefreshMini() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M3 8a5 5 0 0 1 9-2.5 M13 3.5v3h-3 M13 8a5 5 0 0 1-9 2.5 M3 12.5v-3h3" />
    </svg>
  )
}

function FileActionMenu({
  canRename,
  canCopy,
  canCopyContent,
  busy,
  onRename,
  onCopyRelative,
  onCopyFull,
  onCopyName,
  onCopyContent,
  copyContentLabel,
  onRefresh,
  onClose,
}) {
  const [copyOpen, setCopyOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        role="menuitem"
        disabled={!canRename}
        style={S.menuItem}
        onClick={() => {
          onClose()
          onRename()
        }}
      >
        <PencilIcon />
        <span style={S.menuLabel}>重命名</span>
      </button>
      <div
        style={{ position: 'relative' }}
        onMouseEnter={() => {
          if (canCopy) setCopyOpen(true)
        }}
        onMouseLeave={() => setCopyOpen(false)}
      >
        <button
          type="button"
          role="menuitem"
          disabled={!canCopy}
          style={S.menuItem}
          onClick={() => {
            if (canCopy) setCopyOpen((value) => !value)
          }}
        >
          <CopyIcon />
          <span style={S.menuLabel}>复制</span>
          <span style={S.menuChevron}>›</span>
        </button>
        {copyOpen && canCopy ? (
          <div style={S.submenu} role="menu">
            <button type="button" role="menuitem" style={S.menuItem} onClick={() => { onClose(); onCopyRelative() }}>
              <span style={S.menuLabel}>复制相对路径</span>
            </button>
            <button type="button" role="menuitem" style={S.menuItem} onClick={() => { onClose(); onCopyFull() }}>
              <span style={S.menuLabel}>复制完整路径</span>
            </button>
            <button type="button" role="menuitem" style={S.menuItem} onClick={() => { onClose(); onCopyName() }}>
              <span style={S.menuLabel}>复制名称</span>
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={!canCopyContent}
              style={S.menuItem}
              onClick={() => {
                if (!canCopyContent) return
                onClose()
                onCopyContent()
              }}
            >
              <span style={S.menuLabel}>{copyContentLabel ?? '复制内容'}</span>
            </button>
          </div>
        ) : null}
      </div>
      <div style={S.menuSep} />
      <button
        type="button"
        role="menuitem"
        disabled={busy}
        style={S.menuItem}
        onClick={() => {
          onClose()
          onRefresh()
        }}
      >
        <RefreshMini />
        <span style={S.menuLabel}>刷新</span>
      </button>
    </>
  )
}

function useDismiss(open, boxRef, onClose, { ignoreRightClick = false } = {}) {
  useEffect(() => {
    if (!open) return undefined
    const onDown = (event) => {
      if (ignoreRightClick && event.button === 2) return
      if (boxRef.current?.contains(event.target)) return
      onClose()
    }
    const onKey = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open, boxRef, onClose, ignoreRightClick])
}

export function MoreMenu(props) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)
  const close = () => setOpen(false)
  useDismiss(open, boxRef, close)

  return (
    <div ref={boxRef} style={{ position: 'relative' }}>
      <button
        type="button"
        style={S.iconBtn}
        title="更多"
        aria-label="更多"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <DotsIcon />
      </button>
      {open ? (
        <div style={S.menu} role="menu">
          <FileActionMenu {...props} onClose={close} />
        </div>
      ) : null}
    </div>
  )
}

export function FileContextMenu({ x, y, onClose, ...props }) {
  const boxRef = useRef(null)
  useDismiss(true, boxRef, onClose, { ignoreRightClick: true })
  const left = Math.max(8, Math.min(x, window.innerWidth - 228))
  const top = Math.max(8, Math.min(y, window.innerHeight - 200))

  return (
    <div
      ref={boxRef}
      role="menu"
      style={{ ...S.menu, position: 'fixed', top, left, right: 'auto', marginTop: 0, zIndex: 120 }}
    >
      <FileActionMenu {...props} onClose={onClose} />
    </div>
  )
}

function SearchGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true" style={{ opacity: 0.45, flex: '0 0 14px' }}>
      <circle cx="7" cy="7" r="4.2" />
      <path d="M10.2 10.2 13.2 13.2" />
    </svg>
  )
}

function PaneFileIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M4 2.5h5L12.5 6v7.5H4z" />
      <path d="M9 2.5V6h3.5" />
    </svg>
  )
}

function PaneTerminalIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1.2" />
      <path d="M4.5 7 6.5 8.5 4.5 10 M8 10.5h3.5" />
    </svg>
  )
}

function PaneBrowserIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <circle cx="8" cy="8" r="5.5" />
      <path d="M2.5 8h11 M8 2.5c1.8 1.8 2.7 3.6 2.7 5.5S9.8 11.7 8 13.5C6.2 11.7 5.3 9.9 5.3 8S6.2 4.3 8 2.5z" />
    </svg>
  )
}

function PaneChangesIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M4 3.5h6L12.5 6v6.5H4z" />
      <path d="M10 3.5V6h2.5" />
      <path d="M6 9h4 M6 11h2.5" />
    </svg>
  )
}

function PaneCanvasIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M3.5 11.5 11.2 3.8a1.2 1.2 0 0 1 1.7 1.7L5.2 13.2 3 13.6z" />
    </svg>
  )
}

function PaneChatIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M3 4.2A1.7 1.7 0 0 1 4.7 2.5h6.6A1.7 1.7 0 0 1 13 4.2v5.1A1.7 1.7 0 0 1 11.3 11H7.2L4 13.2V11H4.7A1.7 1.7 0 0 1 3 9.3z" />
    </svg>
  )
}

export const PANE_META = {
  file: { label: 'Files', Icon: PaneFileIcon },
  terminal: { label: '终端', Icon: PaneTerminalIcon },
  browser: { label: '浏览器', Icon: PaneBrowserIcon },
  changes: { label: '改动', Icon: PaneChangesIcon },
  canvas: { label: '画布', Icon: PaneCanvasIcon },
  sidechat: { label: '侧边对话', Icon: PaneChatIcon },
}

const PANE_ITEMS = [
  { id: 'file', shortcut: 'Ctrl+G', ...PANE_META.file },
  { id: 'terminal', shortcut: 'Ctrl+J', ...PANE_META.terminal },
  { id: 'browser', shortcut: 'Ctrl+Shift+B', ...PANE_META.browser },
  { id: 'changes', shortcut: 'Ctrl+E', ...PANE_META.changes },
  { id: 'canvas', shortcut: 'Ctrl+Shift+A', ...PANE_META.canvas },
  { id: 'sidechat', shortcut: 'Ctrl+Shift+S', ...PANE_META.sidechat },
]

function fileBase(path) {
  const parts = String(path).split(/[/\\]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

export function AddPaneMenu({ files = [], onOpenFile, onAddPane }) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 })
  const boxRef = useRef(null)
  const btnRef = useRef(null)
  const menuRef = useRef(null)
  const close = () => {
    setOpen(false)
    setQuery('')
  }
  useEffect(() => {
    if (!open) return undefined
    const onDown = (event) => {
      const target = event.target
      if (boxRef.current?.contains(target) || menuRef.current?.contains(target)) return
      close()
    }
    const onKey = (event) => {
      if (event.key === 'Escape') close()
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open) return undefined
    const place = () => {
      const rect = btnRef.current?.getBoundingClientRect()
      if (!rect) return
      const width = 280
      setMenuPos({
        top: rect.bottom + 4,
        left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  const needle = query.trim().toLowerCase()
  const panes = useMemo(
    () => PANE_ITEMS.filter((item) => !needle || item.label.toLowerCase().includes(needle) || item.id.includes(needle)),
    [needle],
  )
  const hits = useMemo(() => {
    if (!needle) return []
    return files
      .filter((item) => {
        const name = (item.name ?? fileBase(item.path)).toLowerCase()
        return name.includes(needle) || String(item.path).toLowerCase().includes(needle)
      })
      .slice(0, 12)
  }, [files, needle])

  const pick = (item) => {
    close()
    onAddPane?.(item.id)
  }

  return (
    <div ref={boxRef} style={{ position: 'relative', flex: '0 0 auto' }}>
      <button
        ref={btnRef}
        type="button"
        style={S.iconBtn}
        title="打开"
        aria-label="打开"
        aria-expanded={open}
        onClick={() => {
          const rect = btnRef.current?.getBoundingClientRect()
          if (rect) {
            const width = 280
            setMenuPos({
              top: rect.bottom + 4,
              left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
            })
          }
          setOpen((value) => !value)
        }}
      >
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <path d="M8 3.2v9.6M3.2 8h9.6" />
        </svg>
      </button>
      {open ? createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{
            ...S.addMenu,
            position: 'fixed',
            top: menuPos.top,
            left: menuPos.left,
            right: 'auto',
            marginTop: 0,
            zIndex: 2147483646,
          }}
        >
          <div style={S.addMenuSearch}>
            <SearchGlyph />
            <input
              autoFocus
              style={S.addMenuSearchInput}
              placeholder="打开文件、网址…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') close()
                if (event.key === 'Enter' && hits[0]) {
                  event.preventDefault()
                  close()
                  onOpenFile?.(hits[0].path)
                }
              }}
            />
          </div>
          {hits.map((item) => (
            <button
              key={item.path}
              type="button"
              role="menuitem"
              style={S.menuItem}
              title={item.path}
              onClick={() => {
                close()
                onOpenFile?.(item.path)
              }}
            >
              <FileKindIcon name={item.name ?? fileBase(item.path)} />
              <span style={S.menuLabel}>{item.name ?? fileBase(item.path)}</span>
            </button>
          ))}
          {hits.length > 0 && panes.length > 0 ? <div style={S.menuSep} /> : null}
          {panes.map((item) => {
            const Icon = item.Icon
            return (
              <button
                key={item.id}
                type="button"
                role="menuitem"
                style={S.menuItem}
                onClick={() => pick(item)}
              >
                <Icon />
                <span style={S.menuLabel}>{item.label}</span>
                <span style={S.addMenuKbd}>{item.shortcut}</span>
              </button>
            )
          })}
          {hits.length === 0 && panes.length === 0 ? (
            <div style={{ ...S.menuItem, cursor: 'default', opacity: 0.55 }}>没有匹配</div>
          ) : null}
        </div>,
        document.body,
      ) : null}
    </div>
  )
}
