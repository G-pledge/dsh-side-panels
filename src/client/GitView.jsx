import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { gitApi } from './api.js'
import { GitBranchPicker, BranchButton } from './GitBranchPicker.jsx'
import { GitGraph } from './GitGraph.jsx'
import { FileKindIcon, gitColor } from './icons.jsx'
import { S } from './styles.js'

function fileBase(path) {
  const parts = String(path).split(/[/\\]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

function fileDir(path) {
  const posix = String(path).replace(/\\/g, '/')
  const cut = posix.lastIndexOf('/')
  return cut > 0 ? posix.slice(0, cut) : ''
}

function PlusGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M8 3.2v9.6M3.2 8h9.6" />
    </svg>
  )
}

function MinusGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M3.2 8h9.6" />
    </svg>
  )
}

function DiscardGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M4.2 4.2 11.8 11.8M11.8 4.2 4.2 11.8" />
    </svg>
  )
}

function RefreshGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M3 8a5 5 0 0 1 9-2.5 M13 3.5v3h-3 M13 8a5 5 0 0 1-9 2.5 M3 12.5v-3h3" />
    </svg>
  )
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M3.2 8.2 6.6 11.6 12.8 4.4" />
    </svg>
  )
}

function DownGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="12" height="12" fill="currentColor" aria-hidden="true">
      <path d="M4.2 6.2 8 10l3.8-3.8z" />
    </svg>
  )
}

function Chevron({ open, size = 12 }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} fill="currentColor" aria-hidden="true" style={{ transform: open ? 'rotate(90deg)' : 'none', flex: 'none', opacity: size < 12 ? 0.7 : 1 }}>
      <path d="M6 3.2 11.2 8 6 12.8z" />
    </svg>
  )
}

function ChangeRow({ item, side, selected, busy, onOpen, onPrimary, onDiscard, onMenu, primaryTitle, discardTitle }) {
  const dir = fileDir(item.path)
  return (
    <div
      data-dsh-git-row=""
      data-active={selected ? '1' : undefined}
      style={{ ...S.gitRow, ...(selected ? S.gitRowActive : {}) }}
      onClick={() => onOpen(item, side)}
      onContextMenu={(event) => {
        if (!onMenu) return
        event.preventDefault()
        event.stopPropagation()
        onMenu(event, item, side)
      }}
    >
      <span style={{ flex: 'none', display: 'inline-flex' }}>
        <FileKindIcon name={fileBase(item.path)} />
      </span>
      <span style={S.gitRowName} title={item.origPath ? `${item.origPath} → ${item.path}` : item.path}>
        {fileBase(item.path)}
      </span>
      {dir ? <span style={S.gitRowDir} title={dir}>{dir}</span> : <span style={S.gitRowDir} />}
      <span data-dsh-git-actions="" style={S.gitRowActions} onClick={(event) => event.stopPropagation()}>
        {onDiscard ? (
          <button type="button" style={S.gitTiny} title={discardTitle} disabled={busy} onClick={() => onDiscard(item)}>
            <DiscardGlyph />
          </button>
        ) : null}
        <button type="button" style={S.gitTiny} title={primaryTitle} disabled={busy} onClick={() => onPrimary(item)}>
          {side === 'index' ? <MinusGlyph /> : <PlusGlyph />}
        </button>
      </span>
      <span style={{ ...S.git, color: gitColor(item.letter) }}>{item.letter}</span>
    </div>
  )
}

function SectionHead({ title, count, open, onToggle, children }) {
  return (
    <div data-dsh-git-section="" style={S.gitSection}>
      <button type="button" style={S.gitTwist} aria-expanded={open} onClick={onToggle}>
        <Chevron open={open} size={11} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
      </button>
      {children ? (
        <span data-dsh-git-section-actions="" style={S.gitSectionActions} onClick={(event) => event.stopPropagation()}>
          {children}
        </span>
      ) : null}
      {count > 0 ? <span style={S.gitBadge}>{count}</span> : null}
    </div>
  )
}

function FileMenu({ x, y, onClose, onPick }) {
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
  const left = Math.max(8, Math.min(x, window.innerWidth - 200))
  const top = Math.max(8, Math.min(y, window.innerHeight - 160))
  const items = [
    { id: 'history', label: '查看文件历史' },
    { id: 'blame', label: '查看归咎' },
    { id: 'ignore', label: '加入忽略列表' },
  ]
  const host = typeof document !== 'undefined' ? document.querySelector('[data-dsh-side-panels]') : null
  const ui = (
    <div ref={boxRef} role="menu" style={{ ...S.menu, position: 'fixed', top, left, right: 'auto', marginTop: 0, zIndex: 140 }}>
      {items.map((item) => (
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
      ))}
    </div>
  )
  return host ? createPortal(ui, host) : ui
}

function MoreMenu({ x, y, ignoreRef, onClose, onPick }) {
  const boxRef = useRef(null)
  useEffect(() => {
    const onDown = (event) => {
      if (boxRef.current?.contains(event.target)) return
      if (ignoreRef?.current?.contains(event.target)) return
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
  }, [onClose, ignoreRef])
  const width = 220
  const height = 360
  const left = Math.max(8, Math.min(x - width, window.innerWidth - width - 8))
  const top = Math.max(8, Math.min(y, window.innerHeight - height - 8))
  const items = [
    ['fetch', '获取'],
    ['pull', '拉取'],
    ['push', '推送'],
    ['publish', '发布当前分支'],
    ['sep'],
    ['stash', '储藏'],
    ['stash-u', '储藏（含未跟踪）'],
    ['merge', '合并…'],
    ['rebase', '变基…'],
    ['rename', '重命名当前分支…'],
    ['delete', '删除分支…'],
  ]
  const host = typeof document !== 'undefined' ? document.querySelector('[data-dsh-side-panels]') : null
  const ui = (
    <div
      ref={boxRef}
      role="menu"
      style={{ ...S.menu, position: 'fixed', top, left, right: 'auto', marginTop: 0, zIndex: 140, minWidth: width }}
    >
      {items.map((item, index) => (
        item[0] === 'sep' ? <div key={`s${index}`} style={S.menuSep} /> : (
          <button
            key={item[0]}
            type="button"
            role="menuitem"
            style={S.menuItem}
            onClick={() => {
              onClose()
              onPick(item[0])
            }}
          >
            <span style={S.menuLabel}>{item[1]}</span>
          </button>
        )
      ))}
    </div>
  )
  return host ? createPortal(ui, host) : ui
}

function CommitMenu({ x, y, ignoreRef, onClose, onPick }) {
  const boxRef = useRef(null)
  useEffect(() => {
    const onDown = (event) => {
      if (boxRef.current?.contains(event.target)) return
      if (ignoreRef?.current?.contains(event.target)) return
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
  }, [onClose, ignoreRef])
  const width = 168
  const height = 168
  const left = Math.max(8, Math.min(x - width, window.innerWidth - width - 8))
  const top = Math.max(8, Math.min(y, window.innerHeight - height - 8))
  const items = [
    ['commit', '提交'],
    ['amend', '提交(修改)'],
    ['sep'],
    ['push', '提交和推送'],
    ['sync', '提交和同步'],
  ]
  const host = typeof document !== 'undefined' ? document.querySelector('[data-dsh-side-panels]') : null
  const ui = (
    <div
      ref={boxRef}
      role="menu"
      style={{ ...S.menu, position: 'fixed', top, left, right: 'auto', marginTop: 0, zIndex: 140, minWidth: width }}
    >
      {items.map((item, index) => (
        item[0] === 'sep' ? <div key={`s${index}`} style={S.menuSep} /> : (
          <button
            key={item[0]}
            type="button"
            role="menuitem"
            style={S.menuItem}
            onClick={() => {
              onClose()
              onPick(item[0])
            }}
          >
            <span style={S.menuLabel}>{item[1]}</span>
          </button>
        )
      ))}
    </div>
  )
  return host ? createPortal(ui, host) : ui
}

function folderFromCloneUrl(url) {
  const text = String(url ?? '').trim().replace(/[\\/]+$/, '')
  const cut = Math.max(text.lastIndexOf('/'), text.lastIndexOf(':'))
  const base = (cut >= 0 ? text.slice(cut + 1) : text).split('\\').pop()
  return String(base || '').replace(/\.git$/i, '')
}

function OverlayList({ title, hint, items, onClose, onPick }) {
  const host = typeof document !== 'undefined' ? document.querySelector('[data-dsh-side-panels]') : null
  const ui = (
    <div
      style={{ ...S.overlay, alignItems: 'flex-start', paddingTop: 48 }}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div data-dsh-dialog="" style={S.gitPick} onPointerDown={(event) => event.stopPropagation()}>
        <div style={{ ...S.gitPickName, display: 'block', padding: '10px 14px 4px' }}>{title}</div>
        {hint ? <div style={S.gitGraphHint}>{hint}</div> : null}
        <div style={S.gitPickList} role="listbox">
          {(items ?? []).length === 0 ? (
            <div style={{ ...S.gitPickItem, opacity: 0.6, cursor: 'default' }}>没有条目</div>
          ) : items.map((item) => (
            <button
              key={item.id}
              type="button"
              style={{ ...S.gitPickItem, width: '100%', border: 0, background: 'transparent', textAlign: 'start' }}
              onClick={() => onPick(item)}
            >
              <div style={S.gitPickBody}>
                <div style={S.gitPickTop}>
                  <span style={S.gitPickName}>{item.title}</span>
                  {item.ago ? <span style={S.gitPickAgo}>{item.ago}</span> : null}
                </div>
                {item.meta ? <div style={S.gitPickMeta}>{item.meta}</div> : null}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
  return host ? createPortal(ui, host) : ui
}

function syncLabel(repo) {
  if (repo.detached) return '分离'
  if (!repo.upstream) return (repo.remotes?.length ? '发布' : '')
  const ahead = repo.ahead || 0
  const behind = repo.behind || 0
  if (ahead === 0 && behind === 0) return '已同步'
  return `${behind}↓ ${ahead}↑`
}

function repoKey(rel) {
  return rel || '.'
}

function reposFromSnap(snap) {
  if (Array.isArray(snap?.repos) && snap.repos.length > 0) return snap.repos
  if (snap?.repo) {
    return [{
      rel: '',
      name: snap.name,
      branch: snap.branch,
      detached: snap.detached,
      empty: snap.empty,
      ahead: snap.ahead,
      behind: snap.behind,
      staged: snap.staged ?? [],
      changes: snap.changes ?? [],
      conflicts: snap.conflicts ?? [],
      stashes: snap.stashes ?? [],
      submodules: snap.submodules ?? [],
      remotes: snap.remotes ?? [],
      upstream: snap.upstream ?? '',
      op: snap.op ?? { kind: '', label: '' },
      ahead: snap.ahead,
      behind: snap.behind,
    }]
  }
  return []
}

function RepoPanel({
  cwd, repo, message, busy, error, activeKey, many, tick,
  onMessage, onOpen, onOpenCommit, onStage, onUnstage, onDiscard, onCommit, onBranch,
  onDone, onError, onRemote, onStash, onPick, onBlame, onHistory, onIgnore,
  onContinue, onAbort, onSubmodule, onCompare, onRename,
}) {
  const staged = repo.staged ?? []
  const changes = repo.changes ?? []
  const branch = repo.detached ? '分离头' : (repo.branch || '未知分支')
  const dirty = staged.length + changes.length > 0
  const placeholder = `消息（Ctrl+Enter 在“${repo.branch || branch}”提交）`
  const selected = (side, path) => activeKey === `gitdiff:${side}:${path}`
  const [openRepo, setOpenRepo] = useState(true)
  const [openStaged, setOpenStaged] = useState(true)
  const [openChanges, setOpenChanges] = useState(true)
  const [openConflicts, setOpenConflicts] = useState(true)
  const [openStashes, setOpenStashes] = useState(true)
  const [openMods, setOpenMods] = useState(false)
  const [more, setMore] = useState()
  const [commitMenu, setCommitMenu] = useState()
  const [fileMenu, setFileMenu] = useState()
  const messageRef = useRef(null)
  const moreBtnRef = useRef(null)
  const commitCaretRef = useRef(null)

  useLayoutEffect(() => {
    const el = messageRef.current
    if (!el) return
    el.style.height = 'auto'
    const full = el.scrollHeight
    el.style.height = `${Math.min(full, 140)}px`
    el.style.overflowY = full > 140 ? 'auto' : 'hidden'
  }, [message, openRepo])

  const dirtyCount = staged.length + changes.length
  const conflicts = repo.conflicts ?? []
  const stashes = repo.stashes ?? []
  const submodules = repo.submodules ?? []
  const op = repo.op ?? { kind: '', label: '' }
  const sync = syncLabel(repo)
  const canCommit = message.trim() !== ''

  const openFileMenu = (event, item, side) => {
    setFileMenu({ x: event.clientX, y: event.clientY, item, side })
  }

  return (
    <div style={many ? S.gitRepoBlock : undefined}>
      <div style={S.gitRepo}>
        <button
          type="button"
          style={S.gitTwist}
          aria-expanded={openRepo}
          title={openRepo ? '收起这个仓库' : '展开这个仓库'}
          onClick={() => setOpenRepo((value) => !value)}
        >
          <Chevron open={openRepo} />
          <span style={S.gitRepoName} title={repo.rel || repo.name}>{repo.name || '仓库'}</span>
        </button>
        <BranchButton
          branch={branch}
          dirty={dirty}
          disabled={busy}
          onClick={onBranch}
        />
        {sync ? (
          <button
            type="button"
            style={S.gitSync}
            title={repo.upstream ? '同步远程' : '发布到远程'}
            disabled={busy || (!repo.upstream && !(repo.remotes ?? []).length)}
            onClick={() => void onRemote(repo.upstream ? 'sync' : 'publish')}
          >
            {sync}
          </button>
        ) : null}
        <button
          ref={moreBtnRef}
          type="button"
          style={S.gitTiny}
          title="更多"
          disabled={busy}
          onClick={(event) => {
            event.stopPropagation()
            if (more) {
              setMore(undefined)
              return
            }
            const rect = event.currentTarget.getBoundingClientRect()
            setMore({ x: rect.right, y: rect.bottom + 4 })
          }}
        >
          ···
        </button>
        {dirtyCount > 0 ? <span style={S.gitBadge}>{dirtyCount}</span> : null}
      </div>
      {openRepo ? (
        <div style={S.gitRepoBody}>
      <div style={S.gitCommitRow}>
        <textarea
          ref={messageRef}
          rows={1}
          data-dsh-git-message=""
          style={S.gitMessage}
          spellCheck={false}
          placeholder={placeholder}
          value={message}
          disabled={busy}
          onChange={(event) => onMessage(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
              event.preventDefault()
              void onCommit({})
            }
          }}
        />
        <div style={S.gitCommitSplit}>
          <button
            type="button"
            data-dsh-git-commit=""
            style={{
              ...S.gitCommit,
              opacity: busy || !canCommit ? 0.45 : 1,
              cursor: busy || !canCommit ? 'default' : 'pointer',
            }}
            disabled={busy || !canCommit}
            onClick={() => void onCommit({})}
          >
            <CheckGlyph />
            提交
          </button>
          <button
            ref={commitCaretRef}
            type="button"
            style={S.gitCommitCaret}
            title="更多提交方式"
            disabled={busy}
            onClick={(event) => {
              event.stopPropagation()
              if (commitMenu) {
                setCommitMenu(undefined)
                return
              }
              const rect = event.currentTarget.getBoundingClientRect()
              setCommitMenu({ x: rect.right, y: rect.bottom + 4 })
            }}
          >
            <DownGlyph />
          </button>
        </div>
        {commitMenu ? (
          <CommitMenu
            x={commitMenu.x}
            y={commitMenu.y}
            ignoreRef={commitCaretRef}
            onClose={() => setCommitMenu(undefined)}
            onPick={(id) => {
              if (id === 'commit') void onCommit({})
              else if (id === 'amend') void onCommit({ amend: true })
              else if (id === 'push') void onCommit({ push: true })
              else if (id === 'sync') void onCommit({ sync: true })
            }}
          />
        ) : null}
      </div>
      {error ? <div style={S.gitError}>{error}</div> : null}
      {op.kind ? (
        <div style={S.gitBanner}>
          <span>{op.label || '操作未结束'}</span>
          <button type="button" style={S.gitLinkBtn} disabled={busy} onClick={() => void onContinue()}>继续</button>
          <button type="button" style={S.gitLinkBtn} disabled={busy} onClick={() => void onAbort()}>放弃</button>
        </div>
      ) : null}
      {conflicts.length > 0 ? (
        <section>
          <SectionHead title="冲突" count={conflicts.length} open={openConflicts} onToggle={() => setOpenConflicts((value) => !value)} />
          {openConflicts ? (
            <div style={S.gitSectionTree}>
              {conflicts.map((item) => (
                <ChangeRow
                  key={`x:${item.path}`}
                  item={item}
                  side="worktree"
                  selected={selected('worktree', item.path)}
                  busy={busy}
                  onOpen={onOpen}
                  onPrimary={(row) => void onStage([row.path])}
                  primaryTitle="标记已解决"
                  onMenu={openFileMenu}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      {staged.length > 0 ? (
        <section>
          <SectionHead
            title="暂存的更改"
            count={staged.length}
            open={openStaged}
            onToggle={() => setOpenStaged((value) => !value)}
          >
            <button
              type="button"
              style={S.gitTiny}
              title="全部取消暂存"
              disabled={busy}
              onClick={() => void onUnstage(staged.map((item) => item.path))}
            >
              <MinusGlyph />
            </button>
          </SectionHead>
          {openStaged ? (
            <div style={S.gitSectionTree}>
              {staged.map((item) => (
                <ChangeRow
                  key={`s:${item.path}`}
                  item={item}
                  side="index"
                  selected={selected('index', item.path)}
                  busy={busy}
                  onOpen={onOpen}
                  onPrimary={(row) => void onUnstage([row.path])}
                  primaryTitle="取消暂存"
                  onMenu={openFileMenu}
                />
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      <section>
        <SectionHead
          title="更改"
          count={changes.length}
          open={openChanges}
          onToggle={() => setOpenChanges((value) => !value)}
        >
          {changes.length > 0 ? (
            <>
              <button
                type="button"
                style={S.gitTiny}
                title="全部丢弃"
                disabled={busy}
                onClick={() => onDiscard(changes.map((item) => item.path), '确定丢弃全部未暂存的更改？丢掉的内容找不回来。')}
              >
                <DiscardGlyph />
              </button>
              <button
                type="button"
                style={S.gitTiny}
                title="全部暂存"
                disabled={busy}
                onClick={() => void onStage(changes.map((item) => item.path))}
              >
                <PlusGlyph />
              </button>
            </>
          ) : null}
        </SectionHead>
        {openChanges ? (
          <div style={S.gitSectionTree}>
            {changes.length === 0 && staged.length === 0 ? (
              <div style={S.gitDiffEmpty}>没有更改</div>
            ) : null}
            {changes.map((item) => (
              <ChangeRow
                key={`c:${item.path}`}
                item={item}
                side="worktree"
                selected={selected('worktree', item.path)}
                busy={busy}
                onOpen={onOpen}
                onPrimary={(row) => void onStage([row.path])}
                onDiscard={(row) => onDiscard(
                  [row.path],
                  row.untracked ? `确定删除未跟踪的 ${fileBase(row.path)}？` : `确定丢弃 ${fileBase(row.path)} 的未暂存更改？`,
                )}
                primaryTitle="暂存"
                discardTitle="丢弃更改"
                onMenu={openFileMenu}
              />
            ))}
          </div>
        ) : null}
      </section>
      {stashes.length > 0 ? (
        <section>
          <SectionHead
            title="储藏"
            count={stashes.length}
            open={openStashes}
            onToggle={() => setOpenStashes((value) => !value)}
          />
          {openStashes ? (
            <div style={S.gitSectionTree}>
              {stashes.map((item) => (
                <div key={item.ref} data-dsh-git-row="" style={S.gitGraphRow} title={item.subject}>
                  <span style={{ ...S.gitGraphSubject, paddingLeft: 12 }}>{item.subject || item.ref}</span>
                  <span style={S.gitGraphAgo}>{item.ago}</span>
                  <span style={S.gitRowActions} data-dsh-git-actions="">
                    <button type="button" style={S.gitTiny} title="应用" disabled={busy} onClick={() => void onStash({ op: 'apply', ref: item.ref })}>应</button>
                    <button type="button" style={S.gitTiny} title="弹出" disabled={busy} onClick={() => void onStash({ op: 'pop', ref: item.ref })}>弹</button>
                    <button type="button" style={S.gitTiny} title="删除" disabled={busy} onClick={() => {
                      if (!window.confirm(`删除 ${item.ref}？`)) return
                      void onStash({ op: 'drop', ref: item.ref })
                    }}>删</button>
                  </span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      {submodules.length > 0 ? (
        <section>
          <SectionHead
            title="子模块"
            count={submodules.length}
            open={openMods}
            onToggle={() => setOpenMods((value) => !value)}
          >
            <button type="button" style={S.gitTiny} title="更新子模块" disabled={busy} onClick={() => void onSubmodule()}>更</button>
          </SectionHead>
          {openMods ? (
            <div style={S.gitSectionTree}>
              {submodules.map((item) => (
                <div key={item.path} style={S.gitGraphRow} title={item.sha}>
                  <span style={{ ...S.gitGraphSubject, paddingLeft: 12 }}>{item.path}</span>
                  <span style={S.gitGraphAgo}>{item.state === 'ok' ? (item.desc || '') : item.state}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
      <GitGraph
        cwd={cwd}
        repo={repo.rel}
        dirty={dirty}
        staged={staged}
        changes={changes}
        busy={busy}
        activeKey={activeKey}
        tick={tick}
        onOpen={onOpen}
        onOpenCommit={onOpenCommit}
        onCompare={onCompare}
        stashes={stashes}
        onDone={onDone}
        onError={onError}
      />
      {more ? (
        <MoreMenu
          x={more.x}
          y={more.y}
          ignoreRef={moreBtnRef}
          onClose={() => setMore(undefined)}
          onPick={(id) => {
            if (id === 'stash') void onStash({ op: 'push' })
            else if (id === 'stash-u') void onStash({ op: 'push', includeUntracked: true })
            else if (id === 'merge') onPick('merge')
            else if (id === 'rebase') onPick('rebase')
            else if (id === 'rename') onRename()
            else if (id === 'delete') onPick('delete')
            else void onRemote(id)
          }}
        />
      ) : null}
      {fileMenu ? (
        <FileMenu
          x={fileMenu.x}
          y={fileMenu.y}
          onClose={() => setFileMenu(undefined)}
          onPick={(id) => {
            const item = fileMenu.item
            if (id === 'ignore') onIgnore?.(item)
            if (id === 'history') onHistory?.(item)
            if (id === 'blame') onBlame?.(item)
          }}
        />
      ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function GitView({ cwd, active, activeKey, reload, onTree, onFiles, onOpen, onBlame, onCompareDiff }) {
  const [snap, setSnap] = useState()
  const [error, setError] = useState()
  const [busy, setBusy] = useState(false)
  const [messages, setMessages] = useState({})
  const [branchOpen, setBranchOpen] = useState()
  const [pickIntent, setPickIntent] = useState('checkout')
  const [tick, setTick] = useState(0)
  const [cloneUrl, setCloneUrl] = useState('')
  const [cloneName, setCloneName] = useState('')
  const [history, setHistory] = useState()
  const [comparePack, setComparePack] = useState()
  const fpRef = useRef('')

  const load = async (quiet = false) => {
    if (!cwd) return
    const result = await gitApi.snapshot(cwd)
    if (!result.ok) {
      if (!quiet) {
        setError(result.error?.message ?? '读不了 git 状态')
        setSnap(undefined)
      }
      return
    }
    setError(undefined)
    const next = result.value
    const fp = JSON.stringify({ repo: next.repo, repos: next.repos })
    if (quiet && fp === fpRef.current) return
    fpRef.current = fp
    setSnap(next)
    setTick((value) => value + 1)
    onTree?.()
  }

  useEffect(() => {
    fpRef.current = ''
    setMessages({})
    setSnap(undefined)
    setBranchOpen(undefined)
    setPickIntent('checkout')
    setHistory(undefined)
    setComparePack(undefined)
    if (!cwd) return undefined
    void load()
    return undefined
  }, [cwd])

  useEffect(() => {
    if (active) void load()
  }, [active, cwd])

  useEffect(() => {
    if (reload) void load()
  }, [reload])

  useEffect(() => {
    if (!cwd || !active) return undefined
    const id = window.setInterval(() => { void load(true) }, 5000)
    return () => window.clearInterval(id)
  }, [cwd, active])

  const afterMutate = async (files) => {
    await load()
    if (files) onFiles?.()
  }

  const run = async (work, files) => {
    if (busy) return
    setBusy(true)
    try {
      const result = await work()
      if (!result.ok) {
        setError(result.error?.message ?? '操作失败')
        return
      }
      setError(undefined)
      await afterMutate(files)
    } finally {
      setBusy(false)
    }
  }

  const stage = (paths, repo) => run(() => gitApi.stage(cwd, paths, repo), false)
  const unstage = (paths, repo) => run(() => gitApi.unstage(cwd, paths, repo), false)
  const discard = (paths, label, repo) => {
    if (!window.confirm(label)) return
    void run(() => gitApi.discard(cwd, paths, repo), true)
  }

  const commit = async (repo, extra = {}) => {
    const key = repoKey(repo.rel)
    const text = (messages[key] ?? '').trim()
    const amend = extra.amend === true
    if (!text && !amend) {
      setError('请填写提交说明')
      return
    }
    if (busy) return
    let all = false
    if (!amend && (repo.staged?.length ?? 0) === 0) {
      if ((repo.changes?.length ?? 0) === 0) {
        setError('没有可提交的更改')
        return
      }
      if (!window.confirm('没有暂存的更改。要把所有更改暂存并提交吗？')) return
      all = true
    }
    setBusy(true)
    try {
      const result = await gitApi.commit(cwd, text, all, repo.rel, {
        amend,
        push: extra.push === true,
        sync: extra.sync === true,
      })
      if (!result.ok) {
        setError(result.error?.message ?? '提交失败')
        return
      }
      setMessages((prev) => ({ ...prev, [key]: '' }))
      setError(undefined)
      await load()
      onFiles?.()
    } finally {
      setBusy(false)
    }
  }

  const openHistory = async (repo, item) => {
    const result = await gitApi.fileLog(cwd, repo.rel, item.path)
    if (!result.ok) {
      setError(result.error?.message ?? '读不了文件历史')
      return
    }
    setHistory({
      repo: repo.rel,
      path: item.path,
      commits: result.value.commits ?? [],
    })
  }

  const openCompare = async (repoRel, from, to) => {
    const result = await gitApi.compare(cwd, repoRel, from.hash, to.hash)
    if (!result.ok) {
      setError(result.error?.message ?? '两次提交对比失败')
      return
    }
    setComparePack({
      repo: repoRel,
      a: from.hash,
      b: to.hash,
      from,
      to,
      files: result.value.files ?? [],
    })
  }

  const head = () => (
    <div style={S.gitHead}>
      <div style={S.gitHeadTitle}>源代码管理</div>
      <button type="button" style={S.iconBtn} title="刷新" onClick={() => void load()} disabled={busy}>
        <RefreshGlyph />
      </button>
    </div>
  )

  const emptyActions = () => (
    <div style={S.gitForm}>
      {error ? <div style={S.gitError}>{error}</div> : null}
      <div style={S.gitDiffEmpty}>工作目录里没有 git 仓库</div>
      <button type="button" style={S.gitCommit} disabled={busy} onClick={() => void run(() => gitApi.init(cwd), true)}>
        在这里初始化
      </button>
      <input
        style={S.gitMessage}
        placeholder="克隆地址（https / ssh）"
        value={cloneUrl}
        disabled={busy}
        onChange={(event) => setCloneUrl(event.target.value)}
      />
      <input
        style={S.gitMessage}
        placeholder="文件夹名"
        value={cloneName}
        disabled={busy}
        onChange={(event) => setCloneName(event.target.value)}
      />
      <button
        type="button"
        style={S.gitCommit}
        disabled={busy || cloneUrl.trim() === ''}
        onClick={() => {
          const name = cloneName.trim() || folderFromCloneUrl(cloneUrl)
          if (!name) {
            setError('请填写文件夹名')
            return
          }
          void run(() => gitApi.clone(cwd, cloneUrl.trim(), name), true)
        }}
      >
        克隆到工作目录
      </button>
    </div>
  )

  if (!cwd) return <div style={S.empty}>这条对话还没有工作目录</div>
  if (!snap) {
    return (
      <div style={S.gitScm}>
        {head()}
        <div style={S.empty}>{error || '正在读取 git…'}</div>
      </div>
    )
  }

  const repos = reposFromSnap(snap)
  if (repos.length === 0) {
    return (
      <div style={S.gitScm}>
        {head()}
        {emptyActions()}
      </div>
    )
  }

  const many = repos.length > 1
  const branchRepo = repos.find((item) => repoKey(item.rel) === branchOpen)

  return (
    <div style={S.gitScm}>
      {head()}
      {error && many ? <div style={S.gitError}>{error}</div> : null}
      <div style={S.gitLists}>
        {repos.map((repo) => (
          <RepoPanel
            key={repoKey(repo.rel)}
            cwd={cwd}
            repo={repo}
            message={messages[repoKey(repo.rel)] ?? ''}
            busy={busy}
            error={!many ? error : undefined}
            activeKey={activeKey}
            many={many}
            tick={tick}
            onMessage={(text) => setMessages((prev) => ({ ...prev, [repoKey(repo.rel)]: text }))}
            onOpen={(item, side) => onOpen({ ...item, repo: repo.rel }, side)}
            onOpenCommit={(item, hash) => onOpen({ ...item, repo: repo.rel, commit: hash }, 'commit')}
            onStage={(paths) => void stage(paths, repo.rel)}
            onUnstage={(paths) => void unstage(paths, repo.rel)}
            onDiscard={(paths, label) => discard(paths, label, repo.rel)}
            onCommit={(extra) => void commit(repo, extra)}
            onBranch={() => {
              setPickIntent('checkout')
              setBranchOpen(repoKey(repo.rel))
            }}
            onRemote={(kind) => void run(() => gitApi.remote(cwd, repo.rel, kind), true)}
            onStash={(options) => void run(() => gitApi.stash(cwd, repo.rel, options), true)}
            onPick={(intent) => {
              setPickIntent(intent)
              setBranchOpen(repoKey(repo.rel))
            }}
            onBlame={(item) => onBlame?.({ ...item, repo: repo.rel })}
            onHistory={(item) => void openHistory(repo, item)}
            onIgnore={(item) => {
              if (!window.confirm(`把 ${fileBase(item.path)} 加入忽略列表？`)) return
              void run(() => gitApi.ignore(cwd, repo.rel, item.path), true)
            }}
            onContinue={() => void run(() => gitApi.continueOp(cwd, repo.rel), true)}
            onAbort={() => {
              if (!window.confirm('放弃这次未完成的合并或变基？')) return
              void run(() => gitApi.abortOp(cwd, repo.rel), true)
            }}
            onSubmodule={() => void run(() => gitApi.submoduleUpdate(cwd, repo.rel), true)}
            onCompare={(from, to) => void openCompare(repo.rel, from, to)}
            onRename={() => {
              const next = window.prompt('新分支名', repo.branch || '')
              if (!next || next.trim() === '') return
              void run(() => gitApi.branchOp(cwd, repo.rel, { op: 'rename', newName: next.trim() }), true)
            }}
            onDone={(files) => {
              void load()
              if (files) onFiles?.()
            }}
            onError={(message) => setError(message)}
          />
        ))}
      </div>
      {branchRepo ? (
        <GitBranchPicker
          cwd={cwd}
          repo={branchRepo.rel}
          intent={pickIntent}
          onClose={() => {
            setBranchOpen(undefined)
            setPickIntent('checkout')
          }}
          onPick={(item) => {
            if (pickIntent === 'merge') void run(() => gitApi.merge(cwd, branchRepo.rel, { ref: item.name }), true)
            else if (pickIntent === 'rebase') void run(() => gitApi.rebase(cwd, branchRepo.rel, { ref: item.name }), true)
            else if (pickIntent === 'delete') {
              if (!window.confirm(`删除分支 ${item.name}？`)) return
              void run(() => gitApi.branchOp(cwd, branchRepo.rel, { op: 'delete', name: item.name }), true)
            }
          }}
          onDone={() => {
            setBranchOpen(undefined)
            setPickIntent('checkout')
            void load()
            onFiles?.()
          }}
        />
      ) : null}
      {history ? (
        <OverlayList
          title={`${fileBase(history.path)} 的历史`}
          hint={history.path}
          items={(history.commits ?? []).map((item) => ({
            id: item.hash,
            title: item.subject || item.short,
            ago: item.ago,
            meta: `${item.author || ''} · ${item.short}`,
            hash: item.hash,
          }))}
          onClose={() => setHistory(undefined)}
          onPick={(item) => {
            setHistory(undefined)
            onOpen?.({ path: history.path, repo: history.repo, commit: item.hash }, 'commit')
          }}
        />
      ) : null}
      {comparePack ? (
        <OverlayList
          title={`对比 ${comparePack.from?.short || comparePack.a.slice(0, 7)} → ${comparePack.to?.short || comparePack.b.slice(0, 7)}`}
          items={(comparePack.files ?? []).map((item) => ({
            id: item.path,
            title: fileBase(item.path),
            meta: `${item.letter || ''} ${fileDir(item.path)}`.trim(),
            path: item.path,
            letter: item.letter,
          }))}
          onClose={() => setComparePack(undefined)}
          onPick={(item) => {
            setComparePack(undefined)
            onCompareDiff?.({
              path: item.path,
              repo: comparePack.repo,
              a: comparePack.a,
              b: comparePack.b,
            })
          }}
        />
      ) : null}
    </div>
  )
}
