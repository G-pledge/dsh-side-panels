import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gitApi } from './api.js'
import { S } from './styles.js'

function BranchGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <circle cx="4.5" cy="3.5" r="1.6" />
      <circle cx="4.5" cy="12.5" r="1.6" />
      <circle cx="11.5" cy="8" r="1.6" />
      <path d="M4.5 5.2v5.6 M4.5 8h5.2" />
    </svg>
  )
}

function CloudGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M4.5 12.2h7.2a2.4 2.4 0 0 0 .3-4.8 3.2 3.2 0 0 0-6.2-1 2.3 2.3 0 0 0-1.3 5.8z" />
    </svg>
  )
}

function TagGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M2.8 8.8 8.7 2.9h4.4v4.4L7.2 13.2z" />
      <circle cx="11.2" cy="4.8" r="0.7" fill="currentColor" stroke="none" />
    </svg>
  )
}

function DetachGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M4 10.5A3.5 3.5 0 1 1 8 5.2 M12 5.5A3.5 3.5 0 1 1 8 10.8" />
    </svg>
  )
}

function kindLabel(kind) {
  if (kind === 'local') return '分支'
  if (kind === 'remote') return '远程分支'
  if (kind === 'tag') return '标记'
  return ''
}

function syncText(item) {
  if (!item || (item.ahead === 0 && item.behind === 0)) return ''
  return `${item.behind}↓ ${item.ahead}↑`
}

function haystack(item) {
  return [item.label, item.name, item.author, item.sha, item.subject].filter(Boolean).join(' ').toLowerCase()
}

function placeholderFor(mode, from, intent) {
  if (intent === 'merge') return '选择要合并进来的分支或标记'
  if (intent === 'rebase') return '选择要变基到的分支或标记'
  if (intent === 'delete') return '选择要删除的分支'
  if (mode === 'create' || mode === 'create-from-name') {
    return from ? `请输入新分支名（依据 ${from}）` : '请输入新分支名'
  }
  if (mode === 'create-from') return '选择起始分支或标记'
  if (mode === 'detach') return '选择要分离签出的分支或标记'
  return '选择要签出的分支或标记'
}

export function GitBranchPicker({ cwd, repo, intent = 'checkout', onClose, onDone, onPick }) {
  const [query, setQuery] = useState('')
  const [refs, setRefs] = useState([])
  const [error, setError] = useState()
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('list')
  const [from, setFrom] = useState('')
  const [cursor, setCursor] = useState(0)
  const inputRef = useRef(null)
  const activeRef = useRef(null)

  useEffect(() => {
    let alive = true
    void gitApi.refs(cwd, repo).then((result) => {
      if (!alive) return
      if (!result.ok) {
        setError(result.error?.message ?? '读不了分支列表')
        return
      }
      setRefs(result.value.refs ?? [])
    })
    return () => { alive = false }
  }, [cwd, repo])

  useEffect(() => {
    inputRef.current?.focus()
  }, [mode])

  const items = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (mode === 'create' || mode === 'create-from-name') {
      const name = query.trim()
      return name ? [{ type: 'confirm', id: 'confirm', label: `创建并签出“${name}”` }] : []
    }
    const actions = mode === 'list' && intent === 'checkout'
      ? [
        { type: 'action', id: 'create', label: '+ 创建新分支...' },
        { type: 'action', id: 'create-from', label: '+ 创建新分支依据...' },
        { type: 'action', id: 'detach', label: '签出已分离...' },
      ]
      : []
    const scoped = intent === 'delete'
      ? refs.filter((item) => item.kind === 'local' && !item.current)
      : refs
    const rows = [
      ...scoped.filter((item) => item.kind === 'local').map((item) => ({ ...item, type: 'ref', id: `l:${item.name}` })),
      ...scoped.filter((item) => item.kind === 'remote').map((item) => ({ ...item, type: 'ref', id: `r:${item.name}` })),
      ...scoped.filter((item) => item.kind === 'tag').map((item) => ({ ...item, type: 'ref', id: `t:${item.name}` })),
    ]
    const filtered = q ? [...actions, ...rows].filter((item) => haystack(item).includes(q)) : [...actions, ...rows]
    let seenLocal = false
    let seenRemote = false
    let seenTag = false
    return filtered.map((item) => {
      if (item.type !== 'ref') return item
      let group = ''
      if (item.kind === 'local' && !seenLocal) { group = 'local'; seenLocal = true }
      else if (item.kind === 'remote' && !seenRemote) { group = 'remote'; seenRemote = true }
      else if (item.kind === 'tag' && !seenTag) { group = 'tag'; seenTag = true }
      return { ...item, group }
    })
  }, [mode, query, refs, intent])

  useEffect(() => {
    setCursor(0)
  }, [mode, query, items.length])

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const runCheckout = async (payload) => {
    if (busy) return
    setBusy(true)
    setError(undefined)
    try {
      const result = await gitApi.checkout(cwd, { ...payload, repo })
      if (!result.ok) {
        setError(result.error?.message ?? '签出失败')
        return
      }
      onDone?.()
      onClose()
    } finally {
      setBusy(false)
    }
  }

  const activate = (item) => {
    if (!item || busy) return
    if (item.type === 'action') {
      if (item.id === 'create') {
        setQuery('')
        setFrom('')
        setMode('create')
        return
      }
      if (item.id === 'create-from') {
        setQuery('')
        setFrom('')
        setMode('create-from')
        return
      }
      if (item.id === 'detach') {
        setQuery('')
        setMode('detach')
      }
      return
    }
    if (item.type === 'confirm') {
      const name = query.trim()
      void runCheckout({ create: true, name, from: from || undefined })
      return
    }
    if (intent === 'merge' || intent === 'rebase' || intent === 'delete') {
      onPick?.(item)
      onClose()
      return
    }
    if (mode === 'create-from') {
      setFrom(item.name)
      setQuery('')
      setMode('create-from-name')
      return
    }
    if (mode === 'detach') {
      void runCheckout({ ref: item.name, kind: item.kind, detached: true })
      return
    }
    if (item.current) {
      onClose()
      return
    }
    void runCheckout({ ref: item.name, kind: item.kind })
  }

  const onKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      if (mode !== 'list') {
        setMode('list')
        setQuery('')
        setFrom('')
        setError(undefined)
        return
      }
      onClose()
      return
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setCursor((value) => Math.min(items.length - 1, value + 1))
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setCursor((value) => Math.max(0, value - 1))
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      activate(items[cursor])
    }
  }

  const host = typeof document !== 'undefined' ? document.querySelector('[data-dsh-side-panels]') : null
  const ui = (
    <div
      style={{ ...S.overlay, alignItems: 'flex-start', paddingTop: 48 }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        data-dsh-git-pick=""
        data-dsh-dialog=""
        style={S.gitPick}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          style={S.gitPickInput}
          value={query}
          placeholder={placeholderFor(mode, from, intent)}
          disabled={busy}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {error ? <div style={S.gitPickError}>{error}</div> : null}
        <div style={S.gitPickList} role="listbox">
          {items.length === 0 ? (
            <div style={{ ...S.gitPickItem, opacity: 0.6, cursor: 'default' }}>
              {mode === 'create' || mode === 'create-from-name' ? '输入新分支名' : '没有匹配项'}
            </div>
          ) : items.map((item, index) => {
            const active = index === cursor
            const icon = item.type !== 'ref'
              ? (item.id === 'detach' ? <DetachGlyph /> : null)
              : item.kind === 'remote'
                ? <CloudGlyph />
                : item.kind === 'tag'
                  ? <TagGlyph />
                  : <BranchGlyph />
            const meta = item.type === 'ref'
              ? [item.author, item.sha, syncText(item), item.subject].filter(Boolean).join(' · ')
              : ''
            return (
              <div
                key={item.id}
                ref={active ? activeRef : undefined}
                role="option"
                aria-selected={active}
                data-active={active ? '1' : undefined}
                style={{ ...S.gitPickItem, ...(active ? S.gitPickItemActive : {}) }}
                onMouseEnter={() => setCursor(index)}
                onClick={() => activate(item)}
              >
                <span style={S.gitPickIcon}>{icon}</span>
                <div style={S.gitPickBody}>
                  <div style={S.gitPickTop}>
                    <span style={S.gitPickName}>{item.label || item.name}</span>
                    {item.ago ? <span style={S.gitPickAgo}>{item.ago}</span> : null}
                    {item.group ? <span style={S.gitPickKind}>{kindLabel(item.kind)}</span> : null}
                  </div>
                  {meta ? <div style={S.gitPickMeta}>{meta}</div> : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
  return host ? createPortal(ui, host) : ui
}

export function BranchButton({ branch, dirty, disabled, onClick }) {
  return (
    <button type="button" style={S.gitBranchBtn} title="签出分支" disabled={disabled} onClick={onClick}>
      <BranchGlyph />
      <span style={S.gitHeadBranch}>{branch}{dirty ? '*' : ''}</span>
    </button>
  )
}
