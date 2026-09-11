import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gitApi } from './api.js'
import { FileKindIcon, gitColor } from './icons.jsx'
import { S } from './styles.js'

const LANE = 12
const ROW_H = 22
const COLORS = ['#0078d4', '#d18616', '#b180d7', '#13a10e', '#00b7c3', '#e74856', '#c239b3', '#4f6bed']

function laneX(index) {
  return 6 + index * LANE
}

function laneColor(index) {
  return COLORS[((index % COLORS.length) + COLORS.length) % COLORS.length]
}

function fileBase(path) {
  const parts = String(path).split(/[/\\]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

function fileDir(path) {
  const posix = String(path).replace(/\\/g, '/')
  const cut = posix.lastIndexOf('/')
  return cut > 0 ? posix.slice(0, cut) : ''
}

function Chevron({ open }) {
  return (
    <svg viewBox="0 0 16 16" width="11" height="11" fill="currentColor" aria-hidden="true" style={{ transform: open ? 'rotate(90deg)' : 'none', flex: 'none', opacity: 0.7 }}>
      <path d="M6 3.2 11.2 8 6 12.8z" />
    </svg>
  )
}

function GraphCanvas({ cols, segs, head, uncommitted }) {
  const width = Math.max(1, cols) * LANE + 8
  return (
    <svg width={width} height={ROW_H} viewBox={`0 0 ${width} ${ROW_H}`} aria-hidden="true" style={{ flex: 'none', display: 'block' }}>
      {(segs ?? []).filter((item) => item.kind !== 'node').map((seg, index) => {
        if (seg.kind === 'v') {
          const x = laneX(seg.x)
          return <line key={index} x1={x} y1={0} x2={x} y2={ROW_H} stroke={laneColor(seg.x)} strokeWidth="1.6" />
        }
        if (seg.kind === 'merge') {
          const x1 = laneX(seg.x1)
          const x2 = laneX(seg.x2)
          return <path key={index} d={`M ${x1} 0 C ${x1} 11, ${x2} 8, ${x2} 11`} fill="none" stroke={laneColor(seg.x1)} strokeWidth="1.6" />
        }
        if (seg.kind === 'fork') {
          const x1 = laneX(seg.x1)
          const x2 = laneX(seg.x2)
          return <path key={index} d={`M ${x1} 11 C ${x1} 16, ${x2} 14, ${x2} ${ROW_H}`} fill="none" stroke={laneColor(seg.x2)} strokeWidth="1.6" />
        }
        return null
      })}
      {(segs ?? []).filter((item) => item.kind === 'node').map((seg, index) => {
        const x = laneX(seg.x)
        const fill = uncommitted ? 'transparent' : laneColor(seg.x)
        return (
          <circle
            key={`n${index}`}
            cx={x}
            cy={11}
            r={head || uncommitted ? 4 : 3.2}
            fill={fill}
            stroke={uncommitted ? laneColor(seg.x) : (head ? '#fff' : fill)}
            strokeWidth={uncommitted || head ? 1.6 : 0}
          />
        )
      })}
    </svg>
  )
}

function pillStyle(kind, current) {
  if (kind === 'tag') {
    return { ...S.gitPill, background: 'rgb(209 154 32 / 22%)', color: '#8a6a12' }
  }
  if (kind === 'remote') {
    return { ...S.gitPill, background: 'rgb(127 127 127 / 16%)', color: '#6b6b6b' }
  }
  if (current) {
    return { ...S.gitPill, background: 'rgb(0 120 212 / 22%)', color: '#005a9e' }
  }
  return { ...S.gitPill, background: 'rgb(0 120 212 / 12%)', color: '#0078d4' }
}

function haystack(commit) {
  const refs = (commit.refs ?? []).map((item) => item.name).join(' ')
  return [commit.subject, commit.author, commit.short, commit.hash, refs].join(' ').toLowerCase()
}

function GraphFileRow({ item, selected, onOpen }) {
  const dir = fileDir(item.path)
  return (
    <div
      data-dsh-git-row=""
      data-active={selected ? '1' : undefined}
      style={{ ...S.gitRow, ...(selected ? S.gitRowActive : {}) }}
      onClick={() => onOpen(item)}
    >
      <span style={{ flex: 'none', display: 'inline-flex' }}>
        <FileKindIcon name={fileBase(item.path)} />
      </span>
      <span style={S.gitRowName} title={item.origPath ? `${item.origPath} → ${item.path}` : item.path}>
        {fileBase(item.path)}
      </span>
      {dir ? <span style={S.gitRowDir} title={dir}>{dir}</span> : <span style={S.gitRowDir} />}
      <span style={{ ...S.git, color: gitColor(item.letter) }}>{item.letter}</span>
    </div>
  )
}

function GraphMenu({ x, y, commit, onClose, onPick }) {
  const boxRef = useRef(null)
  useEffect(() => {
    const onDown = (event) => {
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
  }, [onClose])

  const left = Math.max(8, Math.min(x, window.innerWidth - 240))
  const top = Math.max(8, Math.min(y, window.innerHeight - 360))
  const locals = (commit.refs ?? []).filter((item) => item.kind === 'local' && !item.current)
  const items = [
    { id: 'checkout', label: '签出这次提交' },
    { id: 'branch', label: '在此新建分支…' },
    { id: 'tag', label: '在此打标记…' },
    { id: 'sep1' },
    { id: 'merge', label: '合并到当前分支' },
    { id: 'rebase', label: '变基到这里' },
    { id: 'cherry', label: '拣选到当前分支' },
    { id: 'compare-from', label: '选为对比起点' },
    { id: 'compare-to', label: '与对比起点比较' },
    { id: 'revert', label: '还原这次提交' },
    { id: 'sep2' },
    { id: 'reset-soft', label: '软重置到这里（保留暂存）' },
    { id: 'reset-mixed', label: '重置到这里（保留改动）' },
    { id: 'reset-hard', label: '硬重置到这里（丢掉改动）' },
    ...locals.flatMap((item) => [{ id: `delete-branch:${item.name}`, label: `删除分支 ${item.name}` }]),
    { id: 'sep3' },
    { id: 'copy-hash', label: '复制完整哈希' },
    { id: 'copy-short', label: '复制短哈希' },
    { id: 'copy-subject', label: '复制说明' },
  ]

  return createPortal(
    <div
      ref={boxRef}
      role="menu"
      style={{ ...S.menu, position: 'fixed', top, left, right: 'auto', marginTop: 0, zIndex: 140 }}
    >
      <div style={{ ...S.gitGraphHint, padding: '6px 14px 4px' }} title={commit.hash}>
        {commit.short} · {commit.author}
      </div>
      {items.map((item, index) => (
        item.id.startsWith('sep') ? (
          <div key={`${item.id}:${index}`} style={S.menuSep} />
        ) : (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            style={S.menuItem}
            onClick={() => {
              onClose()
              onPick(item.id)
            }}
          >
            <span style={S.menuLabel}>{item.label}</span>
          </button>
        )
      ))}
    </div>,
    document.querySelector('[data-dsh-side-panels]') || document.body,
  )
}

export function GitGraph({
  cwd, repo, dirty, staged, changes, stashes, busy, activeKey, tick, onOpen, onOpenCommit, onCompare, onDone, onError,
}) {
  const [open, setOpen] = useState(true)
  const [all, setAll] = useState(true)
  const [limit, setLimit] = useState(120)
  const [query, setQuery] = useState('')
  const [pack, setPack] = useState()
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState()
  const [filesByHash, setFilesByHash] = useState({})
  const [menu, setMenu] = useState()
  const [acting, setActing] = useState(false)
  const [compareFrom, setCompareFrom] = useState()
  const repoRel = repo || ''

  const load = async (nextAll = all, nextLimit = limit) => {
    if (!cwd) return
    setLoading(true)
    const result = await gitApi.graph(cwd, repoRel, nextAll, nextLimit)
    setLoading(false)
    if (!result.ok) {
      onError?.(result.error?.message ?? '读不了提交图')
      return
    }
    setPack(result.value)
  }

  useEffect(() => {
    setPack(undefined)
    setExpanded(undefined)
    setFilesByHash({})
    setQuery('')
    setLimit(120)
    if (!cwd || !open) return undefined
    void load(all, 120)
    return undefined
  }, [cwd, repoRel, open, all, tick])

  const commits = pack?.commits ?? []
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return commits
    return commits.filter((item) => haystack(item).includes(q))
  }, [commits, query])

  const showUncommitted = dirty && (query.trim() === '' || '未提交的更改'.includes(query.trim()))
  const selectedCommit = (hash) => expanded === hash
  const selectedFile = (side, path) => activeKey === `gitdiff:${side}:${path}`

  const openCommit = async (commit) => {
    const hash = commit.hash
    setExpanded((current) => (current === hash ? undefined : hash))
    if (filesByHash[hash] || commit.uncommitted) return
    const result = await gitApi.commitFiles(cwd, repoRel, hash)
    if (!result.ok) {
      onError?.(result.error?.message ?? '读不了这次提交的文件')
      return
    }
    setFilesByHash((prev) => ({ ...prev, [hash]: result.value.files ?? [] }))
  }

  const run = async (work, files) => {
    if (busy || acting) return
    setActing(true)
    try {
      const result = await work()
      if (!result.ok) {
        onError?.(result.error?.message ?? '操作失败')
        return
      }
      onError?.(undefined)
      await load()
      onDone?.(files === true)
    } finally {
      setActing(false)
    }
  }

  const onMenu = async (id, commit) => {
    const hash = commit.hash
    if (id === 'copy-hash') {
      try { await navigator.clipboard.writeText(hash) } catch { /* 忽略 */ }
      return
    }
    if (id === 'copy-short') {
      try { await navigator.clipboard.writeText(commit.short) } catch { /* 忽略 */ }
      return
    }
    if (id === 'copy-subject') {
      try { await navigator.clipboard.writeText(commit.subject || '') } catch { /* 忽略 */ }
      return
    }
    if (id === 'checkout') {
      if (!window.confirm(`签出 ${commit.short} 会进入分离头状态。继续？`)) return
      await run(() => gitApi.checkout(cwd, { ref: hash, detached: true, repo: repoRel }), true)
      return
    }
    if (id === 'branch') {
      const name = window.prompt('新分支名')
      if (!name || name.trim() === '') return
      await run(() => gitApi.checkout(cwd, { create: true, name: name.trim(), from: hash, repo: repoRel }), true)
      return
    }
    if (id === 'tag') {
      const name = window.prompt('标记名')
      if (!name || name.trim() === '') return
      await run(() => gitApi.tag(cwd, repoRel, name.trim(), hash), false)
      return
    }
    if (id === 'merge') {
      if (!window.confirm(`把 ${commit.short} 合并进当前分支？`)) return
      await run(() => gitApi.merge(cwd, repoRel, { ref: hash }), true)
      return
    }
    if (id === 'rebase') {
      if (!window.confirm(`当前分支会变基到 ${commit.short}。继续？`)) return
      await run(() => gitApi.rebase(cwd, repoRel, { ref: hash }), true)
      return
    }
    if (id === 'compare-from') {
      setCompareFrom(commit)
      return
    }
    if (id === 'compare-to') {
      if (!compareFrom) {
        onError?.('先右键另一次提交，选「选为对比起点」')
        return
      }
      onCompare?.(compareFrom, commit)
      return
    }
    if (id === 'cherry') {
      if (!window.confirm(`把 ${commit.short} 拣选到当前分支？`)) return
      await run(() => gitApi.cherryPick(cwd, repoRel, hash), true)
      return
    }
    if (id === 'revert') {
      if (!window.confirm(`用一次新提交还原 ${commit.short}？`)) return
      await run(() => gitApi.revert(cwd, repoRel, hash), true)
      return
    }
    if (id === 'reset-soft') {
      if (!window.confirm('当前分支会移到这里，改动会留在暂存区。继续？')) return
      await run(() => gitApi.reset(cwd, repoRel, hash, 'soft'), true)
      return
    }
    if (id === 'reset-mixed') {
      if (!window.confirm('当前分支会移到这里，已提交的内容会改，工作区改动会留下来。继续？')) return
      await run(() => gitApi.reset(cwd, repoRel, hash, 'mixed'), true)
      return
    }
    if (id.startsWith('delete-branch:')) {
      const name = id.slice('delete-branch:'.length)
      if (!window.confirm(`删除分支 ${name}？未合并的提交可能找不到。`)) return
      await run(() => gitApi.branchOp(cwd, repoRel, { op: 'delete', name }), true)
      return
    }
    if (id === 'reset-hard') {
      if (!window.confirm('硬重置会丢掉工作区未提交的改动，找不回来。确定？')) return
      if (!window.confirm('再确认一次：硬重置到这次提交？')) return
      await run(() => gitApi.reset(cwd, repoRel, hash, 'hard'), true)
    }
  }

  const uncommittedFiles = [...(staged ?? []), ...(changes ?? [])]
  const uncommittedSegs = [{ kind: 'v', x: 0 }, { kind: 'node', x: 0 }]

  return (
    <section>
      <div data-dsh-git-section="" style={S.gitSection}>
        <button type="button" style={S.gitTwist} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <Chevron open={open} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>图表</span>
        </button>
        {commits.length > 0 ? <span style={S.gitBadge}>{query.trim() ? filtered.length : commits.length}</span> : null}
      </div>
      {open ? (
        <>
          <div style={S.gitGraphTools}>
            <input
              data-dsh-git-message=""
              style={S.gitGraphSearch}
              placeholder="搜索提交、作者、分支、哈希"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button
              type="button"
              style={{
                ...S.gitGraphToggle,
                background: all ? 'rgb(0 120 212 / 12%)' : 'transparent',
              }}
              title={all ? '正在看全部分支' : '正在看当前分支'}
              disabled={busy || loading}
              onClick={() => setAll((value) => !value)}
            >
              {all ? '全部分支' : '当前分支'}
            </button>
          </div>
          {loading && !pack ? <div style={S.gitGraphHint}>正在读取提交图…</div> : null}
          {!loading && pack && commits.length === 0 ? <div style={S.gitGraphHint}>还没有提交</div> : null}
          {compareFrom ? <div style={S.gitGraphHint}>对比起点 {compareFrom.short} · 再右键另一次提交选「与对比起点比较」</div> : null}
          {(stashes ?? []).length > 0 && query.trim() === '' ? stashes.map((item) => (
            <div key={item.ref} data-dsh-git-row="" style={S.gitGraphRow} title={item.subject}>
              <GraphCanvas cols={1} segs={[{ kind: 'node', x: 0 }]} />
              <div style={S.gitGraphBody}>
                <span style={S.gitGraphPills}>
                  <span style={pillStyle('tag')}>{item.ref}</span>
                </span>
                <span style={S.gitGraphSubject}>{item.subject || item.ref}</span>
                <span style={S.gitGraphAgo}>{item.ago}</span>
              </div>
            </div>
          )) : null}
          {showUncommitted ? (
            <>
              <div
                data-dsh-git-row=""
                data-active={selectedCommit('UNCOMMITTED') ? '1' : undefined}
                style={{ ...S.gitGraphRow, ...(selectedCommit('UNCOMMITTED') ? S.gitRowActive : {}) }}
                onClick={() => setExpanded((current) => (current === 'UNCOMMITTED' ? undefined : 'UNCOMMITTED'))}
              >
                <GraphCanvas cols={1} segs={uncommittedSegs} uncommitted />
                <div style={S.gitGraphBody}>
                  <span style={{ ...S.gitGraphSubject, fontWeight: 600 }}>未提交的更改</span>
                  <span style={S.gitGraphAgo}>{uncommittedFiles.length}</span>
                </div>
              </div>
              {selectedCommit('UNCOMMITTED') ? (
                <>
                  {staged.map((item) => (
                    <GraphFileRow
                      key={`us:${item.path}`}
                      item={item}
                      selected={selectedFile('index', item.path)}
                      onOpen={() => onOpen(item, 'index')}
                    />
                  ))}
                  {changes.map((item) => (
                    <GraphFileRow
                      key={`uc:${item.path}`}
                      item={item}
                      selected={selectedFile('worktree', item.path)}
                      onOpen={() => onOpen(item, 'worktree')}
                    />
                  ))}
                </>
              ) : null}
            </>
          ) : null}
          {filtered.map((commit) => (
            <React.Fragment key={commit.hash}>
              <div
                data-dsh-git-row=""
                data-active={selectedCommit(commit.hash) ? '1' : undefined}
                style={{ ...S.gitGraphRow, ...(selectedCommit(commit.hash) ? S.gitRowActive : {}) }}
                title={`${commit.subject}\n${commit.author} · ${commit.short}`}
                onClick={() => void openCommit(commit)}
                onContextMenu={(event) => {
                  event.preventDefault()
                  event.stopPropagation()
                  setMenu({ x: event.clientX, y: event.clientY, commit })
                }}
              >
                <GraphCanvas cols={commit.cols} segs={commit.segs} head={commit.head === true} />
                <div style={S.gitGraphBody}>
                  {(commit.refs ?? []).length > 0 ? (
                    <span style={S.gitGraphPills}>
                      {commit.refs.map((item) => (
                        <span key={`${item.kind}:${item.name}`} style={pillStyle(item.kind, item.current)} title={item.name}>
                          {item.name}
                        </span>
                      ))}
                    </span>
                  ) : null}
                  <span style={{ ...S.gitGraphSubject, fontWeight: commit.head ? 600 : 400 }}>{commit.subject || '(无说明)'}</span>
                  <span style={S.gitGraphAgo}>{commit.ago || commit.short}</span>
                </div>
              </div>
              {selectedCommit(commit.hash) ? (filesByHash[commit.hash] ?? []).map((item) => (
                <GraphFileRow
                  key={`c:${commit.hash}:${item.path}`}
                  item={item}
                  selected={selectedFile(`c.${commit.hash}`, item.path)}
                  onOpen={() => onOpenCommit(item, commit.hash)}
                />
              )) : null}
              {selectedCommit(commit.hash) && filesByHash[commit.hash]?.length === 0 ? (
                <div style={S.gitGraphHint}>这次提交没有文件改动</div>
              ) : null}
            </React.Fragment>
          ))}
          {pack?.hasMore && query.trim() === '' ? (
            <button
              type="button"
              style={S.gitGraphMore}
              disabled={busy || loading}
              onClick={() => {
                const next = limit + 80
                setLimit(next)
                void load(all, next)
              }}
            >
              {loading ? '正在加载…' : '加载更多'}
            </button>
          ) : null}
          {menu ? (
            <GraphMenu
              x={menu.x}
              y={menu.y}
              commit={menu.commit}
              onClose={() => setMenu(undefined)}
              onPick={(id) => void onMenu(id, menu.commit)}
            />
          ) : null}
        </>
      ) : null}
    </section>
  )
}
