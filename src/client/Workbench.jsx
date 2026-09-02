import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { fileApi } from './api.js'
import { CodeEditor } from './CodeEditor.jsx'
import { TerminalView } from './TerminalView.jsx'
import { base64ToBytes, copyImageBytes, formatHexDump, formatSize } from './hex.js'
import { FileKindIcon, FilesActivityIcon, gitColor, TerminalActivityIcon, WorkbenchToggleIcon } from './icons.jsx'
import { AddPaneMenu, FileContextMenu, MoreMenu, PANE_META } from './MoreMenu.jsx'
import { S } from './styles.js'
import { isCollapsed, subscribeVisibility, toggleCollapsed } from './visibility.js'
import { getPrefs, subscribePrefs } from './prefs.js'
import {
  applyPanelWidthVar, RAIL, readPanelWidth, readTreeWidth, writePanelWidth, writeTreeWidth,
} from './layout.js'

function readSession(sessions) {
  const snap = sessions.list.getSnapshot()
  const id = snap.current
  const cwd = id ? snap.byId[id]?.cwd : undefined
  return { id, cwd: cwd && cwd !== '' ? cwd : undefined }
}

function basename(path) {
  const parts = String(path).split(/[/\\]/).filter(Boolean)
  return parts[parts.length - 1] ?? path
}

function isImagePath(path) {
  return /\.(png|jpe?g|gif|webp|bmp|svg|ico|avif)$/i.test(String(path ?? ''))
}

function parentOf(path) {
  const cut = String(path).lastIndexOf('/')
  return cut < 0 ? '' : path.slice(0, cut)
}

function remapPrefix(from, to, path) {
  if (path == null) return path
  if (path === from) return to
  if (from !== '' && path.startsWith(`${from}/`)) return to + path.slice(from.length)
  return path
}

let paneSeq = 0
function makePane(kind) {
  paneSeq += 1
  return {
    id: `pane-${paneSeq}`,
    kind,
    tabs: [],
    active: undefined,
    contents: new Map(),
    histStack: [],
    histIndex: -1,
    hexMode: false,
  }
}

function remapPane(pane, fix) {
  if (pane.kind !== 'file') return pane
  const contents = new Map()
  for (const [key, value] of pane.contents) {
    const nextKey = fix(key)
    contents.set(nextKey, value && typeof value === 'object' ? { ...value, path: nextKey } : value)
  }
  return {
    ...pane,
    tabs: pane.tabs.map(fix),
    active: pane.active ? fix(pane.active) : pane.active,
    contents,
    histStack: pane.histStack.map(fix),
  }
}

function joinFullPath(root, rel) {
  if (!rel) return root
  const slash = /\\/.test(root) ? '\\' : '/'
  return String(root).replace(/[/\\]+$/, '') + slash + String(rel).replaceAll('/', slash)
}

function isDirectoryPath(path, childrenMap) {
  if (path === '' || path == null) return true
  const rows = childrenMap.get(parentOf(path)) ?? []
  return rows.some((entry) => entry.path === path && entry.directory)
}

async function copyToClipboard(text) {
  const value = String(text ?? '')
  try {
    await navigator.clipboard.writeText(value)
    return true
  } catch {
    try {
      const area = document.createElement('textarea')
      area.value = value
      area.setAttribute('readonly', '')
      area.style.position = 'fixed'
      area.style.left = '-9999px'
      document.body.appendChild(area)
      area.select()
      const ok = document.execCommand('copy')
      area.remove()
      return ok
    } catch {
      return false
    }
  }
}

function Chevron({ open }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="currentColor" aria-hidden="true" style={{ opacity: 0.55, flex: '0 0 16px', transform: open ? 'rotate(90deg)' : 'none' }}>
      <path d="M6 4.2 11.2 8 6 11.8z" />
    </svg>
  )
}

function CloseGlyph() {
  return (
    <svg viewBox="0 0 16 16" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  )
}

function ChromeIcon({ d, title }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <title>{title}</title>
      <path d={d} />
    </svg>
  )
}

function CreateDialog({ kind, folderLabel, name, error, onName, onSubmit, onClose }) {
  const folder = kind === 'folder'
  return (
    <div
      style={S.overlay}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <form
        style={S.dialog}
        data-dsh-dialog=""
        onSubmit={(event) => {
          event.preventDefault()
          void onSubmit()
        }}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div style={S.dialogTitle}>{folder ? '新建文件夹' : '新建文件'}</div>
        <div style={S.dialogHint}>会建在「{folderLabel}」里面</div>
        <input
          autoFocus
          style={S.dialogInput}
          placeholder={folder ? '文件夹名' : '文件名'}
          value={name}
          onChange={(event) => onName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              onClose()
            }
          }}
        />
        {error ? <div style={S.dialogError}>{error}</div> : null}
        <div style={S.dialogActions}>
          <button type="button" style={S.dialogBtn} onClick={onClose}>取消</button>
          <button type="submit" data-dsh-dialog-ok="" style={S.dialogBtnPrimary} disabled={name.trim() === ''}>确定</button>
        </div>
      </form>
    </div>
  )
}

function startDrag(onMove) {
  return (event) => {
    event.preventDefault()
    event.stopPropagation()
    event.currentTarget.setPointerCapture?.(event.pointerId)
    document.documentElement.setAttribute('data-dsh-side-panels-dragging', '')
    const move = (ev) => onMove(ev)
    const up = () => {
      document.documentElement.removeAttribute('data-dsh-side-panels-dragging')
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
  }
}

function gitLetter(path, git) {
  if (!git) return ''
  return git[path] || git[`${path}/`] || ''
}

function revokePreview(file) {
  if (file?.objectUrl) URL.revokeObjectURL(file.objectUrl)
}

function TruncationNote({ file }) {
  if (!file?.truncated) return null
  return (
    <div style={S.banner}>
      文件共 {formatSize(file.size)}，先打开前面 {formatSize(file.loaded ?? file.bytes?.byteLength ?? 0)}
    </div>
  )
}

function isDirty(file) {
  if (!file || file.binary || file.image || file.truncated || file.tooLarge || file.text === undefined) return false
  return file.text !== file.savedText
}

function matchesFilter(name, filter) {
  if (!filter) return true
  return name.toLowerCase().includes(filter.toLowerCase())
}

function TreeRows({
  path, depth, childrenMap, expanded, selected, filter, git, onToggle, onOpen, onContextMenu, rename,
}) {
  const rows = (childrenMap.get(path) ?? []).filter((entry) => {
    if (!filter) return true
    if (matchesFilter(entry.name, filter)) return true
    if (entry.directory && expanded.has(entry.path)) return true
    return false
  })
  return rows.map((entry) => {
    const pad = 8 + depth * 8
    const letter = gitLetter(entry.path, git)
    const renaming = rename?.path === entry.path
    const openMenu = (event) => {
      event.preventDefault()
      event.stopPropagation()
      onContextMenu?.(event, entry)
    }
    const nameSlot = renaming ? (
      <input
        style={S.input}
        autoFocus
        value={rename.draft}
        onChange={(event) => rename.onDraft(event.target.value)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            void rename.onSubmit()
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            rename.onCancel()
          }
        }}
        onBlur={() => void rename.onSubmit()}
      />
    ) : (
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.name}</span>
    )
    if (entry.directory) {
      const open = expanded.has(entry.path)
      const rowInner = (
        <>
          <Chevron open={open} />
          <FileKindIcon name={entry.name} directory open={open} />
          {nameSlot}
          {letter && !renaming ? <span style={{ ...S.git, color: gitColor(letter) }}>{letter}</span> : <span style={S.git} />}
        </>
      )
      return (
        <div key={entry.path}>
          {renaming ? (
            <div style={{ ...S.row, paddingLeft: pad, background: selected === entry.path ? 'rgb(0 122 204 / 14%)' : 'transparent' }}>
              {rowInner}
            </div>
          ) : (
            <button
              type="button"
              style={{ ...S.row, paddingLeft: pad, background: selected === entry.path ? 'rgb(0 122 204 / 14%)' : 'transparent' }}
              onClick={() => onToggle(entry.path)}
              onContextMenu={openMenu}
            >
              {rowInner}
            </button>
          )}
          {open ? (
            <TreeRows
              path={entry.path}
              depth={depth + 1}
              childrenMap={childrenMap}
              expanded={expanded}
              selected={selected}
              filter={filter}
              git={git}
              onToggle={onToggle}
              onOpen={onOpen}
              onContextMenu={onContextMenu}
              rename={rename}
            />
          ) : null}
        </div>
      )
    }
    if (filter && !matchesFilter(entry.name, filter)) return null
    const fileInner = (
      <>
        <FileKindIcon name={entry.name} />
        {nameSlot}
        {letter && !renaming ? <span style={{ ...S.git, color: gitColor(letter) }}>{letter}</span> : <span style={S.git} />}
      </>
    )
    if (renaming) {
      return (
        <div key={entry.path} style={{ ...S.row, paddingLeft: pad + 16, background: selected === entry.path ? 'rgb(0 122 204 / 14%)' : 'transparent' }}>
          {fileInner}
        </div>
      )
    }
    return (
      <button
        key={entry.path}
        type="button"
        style={{ ...S.row, paddingLeft: pad + 16, background: selected === entry.path ? 'rgb(0 122 204 / 14%)' : 'transparent' }}
        onClick={() => onOpen(entry.path)}
        onContextMenu={openMenu}
      >
        {fileInner}
      </button>
    )
  })
}

export function Workbench({ sessions }) {
  const collapsed = useSyncExternalStore(subscribeVisibility, () => isCollapsed())
  const prefs = useSyncExternalStore(subscribePrefs, getPrefs)
  const sessionCache = useRef({ id: undefined, cwd: undefined })
  const session = useSyncExternalStore(sessions.list.subscribe, () => {
    const next = readSession(sessions)
    const prev = sessionCache.current
    if (prev.id === next.id && prev.cwd === next.cwd) return prev
    sessionCache.current = next
    return next
  })

  const [childrenMap, setChildrenMap] = useState(() => new Map())
  const [expanded, setExpanded] = useState(() => new Set(['']))
  const [selected, setSelected] = useState('')
  const [panes, setPanes] = useState(() => [makePane('file')])
  const [activePaneId, setActivePaneId] = useState(() => panes[0].id)
  const [error, setError] = useState()
  const [busy, setBusy] = useState(false)
  const [creating, setCreating] = useState()
  const [draftName, setDraftName] = useState('')
  const [renaming, setRenaming] = useState()
  const [renameDraft, setRenameDraft] = useState('')
  const [ctxMenu, setCtxMenu] = useState()
  const [git, setGit] = useState({})
  const [filter, setFilter] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const [treeHidden, setTreeHidden] = useState(false)
  const [panelWidth, setPanelWidth] = useState(() => readPanelWidth(session.id))
  const [treeWidth, setTreeWidth] = useState(() => readTreeWidth(session.id, readPanelWidth(session.id)))
  const panelRef = useRef(null)
  const searchRef = useRef(null)
  const panesRef = useRef(panes)
  const activePaneIdRef = useRef(activePaneId)
  panesRef.current = panes
  activePaneIdRef.current = activePaneId

  const root = session.cwd
  const rootName = root ? basename(root) : '文件'

  useEffect(() => {
    const nextPanel = readPanelWidth(session.id)
    const nextTree = readTreeWidth(session.id, nextPanel)
    setPanelWidth(nextPanel)
    setTreeWidth(nextTree)
    applyPanelWidthVar(nextPanel)
  }, [session.id])

  useEffect(() => {
    if (!collapsed) applyPanelWidthVar(panelWidth)
  }, [collapsed, panelWidth])

  const loadDir = async (rel, mapSeed) => {
    if (!root) return
    const result = await fileApi.list(root, rel)
    if (!result.ok) {
      setError(result.error?.message ?? '列目录失败')
      return
    }
    setError(undefined)
    setChildrenMap((prev) => {
      const next = new Map(mapSeed ?? prev)
      next.set(rel, result.value.entries)
      return next
    })
  }

  const loadGit = async () => {
    if (!root) return
    const result = await fileApi.status(root)
    if (result.ok) setGit(result.value.git ?? {})
  }

  useEffect(() => {
    for (const pane of panesRef.current) {
      for (const file of pane.contents.values()) revokePreview(file)
    }
    const first = makePane('file')
    setPanes([first])
    setActivePaneId(first.id)
    panesRef.current = [first]
    activePaneIdRef.current = first.id
    setChildrenMap(new Map())
    setExpanded(new Set(['']))
    setSelected('')
    setCreating(undefined)
    setRenaming(undefined)
    setCtxMenu(undefined)
    setError(undefined)
    setGit({})
    setFilter('')
    if (!root) return
    void loadDir('')
    void loadGit()
  }, [session.id, root])

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus()
  }, [searchOpen])

  useEffect(() => {
    const onKey = (event) => {
      if (!((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c')) return
      if (String(window.getSelection?.() ?? '') !== '') return
      const pane = panesRef.current.find((item) => item.id === activePaneIdRef.current)
      const file = pane?.kind === 'file' ? pane.contents.get(pane.active) : undefined
      if (!file?.image || pane.hexMode) return
      event.preventDefault()
      void copyContent(pane.active)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const refreshAll = async () => {
    if (!root) return
    setBusy(true)
    const dirs = ['', ...[...expanded].filter((item) => item !== '')]
    const next = new Map()
    for (const dir of dirs) {
      const result = await fileApi.list(root, dir)
      if (!result.ok) {
        setError(result.error?.message ?? '刷新失败')
        setBusy(false)
        return
      }
      next.set(dir, result.value.entries)
    }
    setChildrenMap(next)
    await loadGit()
    setError(undefined)
    setBusy(false)
  }

  const onToggle = async (path) => {
    setSelected(path)
    const willOpen = !expanded.has(path)
    setExpanded((prev) => {
      const next = new Set(prev)
      if (willOpen) next.add(path)
      else next.delete(path)
      return next
    })
    if (willOpen && !childrenMap.has(path)) await loadDir(path)
  }

  const patchPane = (id, fn) => {
    setPanes((prev) => {
      const source = prev.some((pane) => pane.id === id) ? prev : panesRef.current
      const next = source.map((pane) => (pane.id === id ? fn(pane) : pane))
      panesRef.current = next
      return next
    })
  }

  const addPane = (kind) => {
    const pane = makePane(kind)
    setPanes((prev) => {
      const next = [...prev, pane]
      panesRef.current = next
      return next
    })
    setActivePaneId(pane.id)
    activePaneIdRef.current = pane.id
    if (kind === 'file') setTreeHidden(false)
    setError(undefined)
  }

  const focusOrAddPane = (kind) => {
    const current = panesRef.current.find((pane) => pane.id === activePaneIdRef.current)
    if (current?.kind === kind) {
      if (kind === 'file') setTreeHidden(false)
      return current.id
    }
    const found = [...panesRef.current].reverse().find((pane) => pane.kind === kind)
    if (found) {
      setActivePaneId(found.id)
      activePaneIdRef.current = found.id
      if (kind === 'file') setTreeHidden(false)
      return found.id
    }
    addPane(kind)
    return activePaneIdRef.current
  }

  const ensureFilesPane = () => focusOrAddPane('file')

  const closePane = (id) => {
    const prev = panesRef.current
    const doomed = prev.find((pane) => pane.id === id)
    if (doomed) {
      for (const file of doomed.contents.values()) revokePreview(file)
    }
    const next = prev.filter((pane) => pane.id !== id)
    const closingActive = activePaneIdRef.current === id || !next.some((pane) => pane.id === activePaneIdRef.current)
    let nextActive = activePaneIdRef.current
    if (next.length === 0) {
      nextActive = undefined
    } else if (closingActive) {
      const index = prev.findIndex((pane) => pane.id === id)
      nextActive = (next[Math.max(0, index - 1)] ?? next[0]).id
    }
    panesRef.current = next
    activePaneIdRef.current = nextActive
    setPanes(next)
    setActivePaneId(nextActive)
    const pick = next.find((pane) => pane.id === nextActive)
    if (!pick || pick.kind !== 'file') setTreeHidden(true)
  }

  const resolveFilesPaneId = () => {
    return ensureFilesPane()
  }

  const openPath = async (path, recordHistory = true) => {
    if (!root) return
    setSelected(path)
    const paneId = resolveFilesPaneId()
    const pane = panesRef.current.find((item) => item.id === paneId)
    const already = pane?.contents.has(path)
    patchPane(paneId, (current) => {
      const tabs = current.tabs.includes(path) ? current.tabs : [...current.tabs, path]
      let histStack = current.histStack
      let histIndex = current.histIndex
      if (recordHistory) {
        histStack = histStack.slice(0, histIndex + 1)
        if (histStack[histStack.length - 1] !== path) histStack = [...histStack, path]
        histIndex = histStack.length - 1
      }
      return { ...current, tabs, active: path, histStack, histIndex, hexMode: false }
    })
    if (already) return
    const result = await fileApi.read(root, path)
    if (!result.ok) {
      setError(result.error?.message ?? '打开失败')
      return
    }
    let extra = {}
    if ((result.value.image || result.value.binary) && result.value.data) {
      extra = {
        bytes: base64ToBytes(result.value.data),
        dataUrl: result.value.image ? `data:${result.value.mime};base64,${result.value.data}` : undefined,
      }
    }
    patchPane(paneId, (current) => {
      const contents = new Map(current.contents)
      contents.set(path, {
        ...result.value,
        ...extra,
        savedText: result.value.text,
      })
      return { ...current, contents }
    })
  }

  const goHistory = (delta) => {
    const pane = panesRef.current.find((item) => item.id === activePaneIdRef.current)
    if (!pane || pane.kind !== 'file') return
    const next = pane.histIndex + delta
    if (next < 0 || next >= pane.histStack.length) return
    const path = pane.histStack[next]
    patchPane(pane.id, (current) => ({ ...current, histIndex: next }))
    void openPath(path, false)
  }

  const closeTab = (path) => {
    const paneId = activePaneIdRef.current
    const pane = panesRef.current.find((item) => item.id === paneId)
    if (!pane || pane.kind !== 'file') return
    const nextTabs = pane.tabs.filter((item) => item !== path)
    let nextActive = pane.active
    if (pane.active === path) {
      const index = pane.tabs.indexOf(path)
      nextActive = nextTabs[index] ?? nextTabs[index - 1] ?? undefined
    }
    const doomed = pane.contents.get(path)
    revokePreview(doomed)
    const contents = new Map(pane.contents)
    contents.delete(path)
    patchPane(paneId, (current) => (
      current.kind !== 'file' ? current : { ...current, tabs: nextTabs, active: nextActive, contents, hexMode: false }
    ))
  }

  const updateDraft = (path, text) => {
    patchPane(activePaneIdRef.current, (current) => {
      const file = current.contents.get(path)
      if (!file) return current
      const contents = new Map(current.contents)
      contents.set(path, { ...file, text })
      return { ...current, contents }
    })
  }

  const savePath = async (path) => {
    if (!root) return
    const pane = panesRef.current.find((item) => item.id === activePaneIdRef.current)
    const file = pane?.contents.get(path)
    if (!file || file.binary || file.image || file.truncated || typeof file.text !== 'string') return
    if (file.text === file.savedText) return
    const result = await fileApi.write(root, path, file.text)
    if (!result.ok) {
      setError(result.error?.message ?? '保存失败')
      return
    }
    patchPane(pane.id, (current) => {
      const currentFile = current.contents.get(path)
      if (!currentFile) return current
      const contents = new Map(current.contents)
      contents.set(path, { ...currentFile, savedText: currentFile.text, size: result.value.size })
      return { ...current, contents }
    })
    setError(undefined)
    await loadGit()
  }

  const parentForCreate = useMemo(() => {
    if (selected === '') return ''
    const rows = childrenMap.get(selected)
    if (rows) return selected
    const cut = selected.lastIndexOf('/')
    return cut < 0 ? '' : selected.slice(0, cut)
  }, [selected, childrenMap])

  const knownFiles = useMemo(() => {
    const out = []
    for (const rows of childrenMap.values()) {
      for (const entry of rows) {
        if (!entry.directory) out.push({ path: entry.path, name: entry.name })
      }
    }
    return out
  }, [childrenMap])

  const startCreate = (kind) => {
    setCreating({ kind, dir: parentForCreate })
    setDraftName('')
    setRenaming(undefined)
    setError(undefined)
    setTreeHidden(false)
  }

  const submitCreate = async () => {
    if (!root || !creating) return
    const name = draftName.trim()
    if (name === '') return
    const result = await fileApi.create(root, creating.dir, name, creating.kind === 'folder')
    if (!result.ok) {
      setError(result.error?.message ?? '新建失败')
      return
    }
    setCreating(undefined)
    setDraftName('')
    await loadDir(creating.dir)
    await loadGit()
    if (creating.kind === 'folder') {
      setExpanded((prev) => new Set(prev).add(result.value.path))
      setSelected(result.value.path)
    } else {
      await openPath(result.value.path)
    }
  }

  const applyRemap = (from, to) => {
    const fix = (path) => remapPrefix(from, to, path)
    setSelected((path) => fix(path))
    setPanes((prev) => prev.map((pane) => remapPane(pane, fix)))
    setExpanded((prev) => new Set([...prev].map(fix)))
  }

  const currentFileActive = () => {
    const pane = panesRef.current.find((item) => item.id === activePaneIdRef.current)
    return pane?.kind === 'file' ? pane.active : undefined
  }

  const fileFromPanes = (path) => {
    for (const pane of panesRef.current) {
      if (pane.kind === 'file' && pane.contents.has(path)) return pane.contents.get(path)
    }
  }

  const startRename = (path) => {
    const target = path || selected || currentFileActive()
    if (!target) return
    setCreating(undefined)
    setCtxMenu(undefined)
    setTreeHidden(false)
    setRenaming(target)
    setRenameDraft(basename(target))
  }

  const submitRename = async () => {
    if (!root || !renaming) return
    const name = renameDraft.trim()
    if (name === '' || name === basename(renaming)) {
      setRenaming(undefined)
      return
    }
    const from = renaming
    const result = await fileApi.rename(root, from, name)
    if (!result.ok) {
      setError(result.error?.message ?? '重命名失败')
      return
    }
    applyRemap(from, result.value.path)
    setRenaming(undefined)
    setError(undefined)
    await loadDir(parentOf(from))
    await loadGit()
  }

  const failCopy = () => setError('复制失败，浏览器没允许写入剪贴板')

  const copyRelative = async (path) => {
    const target = path || selected || currentFileActive()
    if (!target) return
    if (!(await copyToClipboard(target))) failCopy()
  }

  const copyFull = async (path) => {
    const target = path || selected || currentFileActive()
    if (!root || !target) return
    if (!(await copyToClipboard(joinFullPath(root, target)))) failCopy()
  }

  const copyName = async (path) => {
    const target = path || selected || currentFileActive()
    if (!target) return
    if (!(await copyToClipboard(basename(target)))) failCopy()
  }

  const copyContent = async (path) => {
    const target = path || selected || currentFileActive()
    if (!root || !target) return
    let file = fileFromPanes(target)
    if (!file || (file.image && !file.bytes && !file.data)) {
      const result = await fileApi.read(root, target)
      if (!result.ok) {
        setError(result.error?.message ?? '复制失败')
        return
      }
      file = result.value.image && result.value.data
        ? { ...result.value, bytes: base64ToBytes(result.value.data) }
        : result.value
    }
    if (file.image) {
      const bytes = file.bytes ?? (file.data ? base64ToBytes(file.data) : null)
      if (!bytes || !(await copyImageBytes(bytes, file.mime))) failCopy()
      return
    }
    let text = file.text
    if (text === undefined) {
      const result = await fileApi.read(root, target)
      if (!result.ok || result.value.binary || result.value.text === undefined) {
        setError('这个文件不能当文本复制')
        return
      }
      text = result.value.text
    }
    if (!(await copyToClipboard(text))) failCopy()
  }

  const openTreeMenu = (event, entry) => {
    setSelected(entry.path)
    setCtxMenu({
      path: entry.path,
      directory: entry.directory === true,
      x: event.clientX,
      y: event.clientY,
    })
  }

  const toggleTree = () => {
    const current = panesRef.current.find((pane) => pane.id === activePaneIdRef.current)
    if (current?.kind !== 'file') {
      ensureFilesPane()
      return
    }
    const hasFiles = panesRef.current.some((pane) => pane.kind === 'file')
    if (!hasFiles || treeHidden) {
      ensureFilesPane()
      return
    }
    setTreeHidden(true)
  }

  if (!prefs.enabled || collapsed) return null

  const activePane = panes.find((pane) => pane.id === activePaneId) ?? panes[0]
  const isFiles = activePane?.kind === 'file'
  const showTree = Boolean(isFiles && !treeHidden)
  const tabs = isFiles ? activePane.tabs : []
  const active = isFiles ? activePane.active : undefined
  const contents = isFiles ? activePane.contents : new Map()
  const histIndex = isFiles ? activePane.histIndex : -1
  const histStack = isFiles ? activePane.histStack : []
  const hexMode = Boolean(isFiles && activePane.hexMode)
  const rootEntries = childrenMap.get('') ?? []
  const viewing = active ? contents.get(active) : undefined
  const onResizePanel = startDrag((event) => {
    const box = panelRef.current?.getBoundingClientRect()
    if (!box) return
    const next = writePanelWidth(session.id, box.right - event.clientX)
    setPanelWidth(next)
    setTreeWidth((prev) => writeTreeWidth(session.id, prev, next))
  })
  const onResizeTree = startDrag((event) => {
    const box = panelRef.current?.getBoundingClientRect()
    if (!box) return
    const next = writeTreeWidth(session.id, box.right - RAIL - event.clientX, panelWidth)
    setTreeWidth(next)
  })

  const gridColumns = showTree
    ? `minmax(0,1fr) 4px ${treeWidth}px ${RAIL}px`
    : `minmax(0,1fr) ${RAIL}px`
  const railColumn = showTree ? 4 : 2
  const showEditorChrome = Boolean(isFiles)

  return (
    <div
      ref={panelRef}
      data-dsh-side-panels=""
      style={{ ...S.panel, width: panelWidth, gridTemplateColumns: gridColumns }}
    >
      <button type="button" data-dsh-grip="panel" title="左右拖动调整宽度" style={{ ...S.grip, insetInlineStart: 0, gridColumn: 1, gridRow: '1 / -1', zIndex: 12 }} onPointerDown={onResizePanel} />

      <div style={{ ...S.filesBar, gridColumn: '1 / -1', gridRow: 1 }}>
        <div style={S.filesBarMain}>
          <div style={S.filesBarLeft}>
            <div style={S.filesPills}>
              {panes.map((pane) => {
                const meta = PANE_META[pane.kind] ?? PANE_META.file
                const Icon = meta.Icon
                const selected = pane.id === activePaneId
                return (
                  <button
                    key={pane.id}
                    type="button"
                    {...(selected ? { 'data-dsh-files-pill': '' } : { 'data-dsh-pane-pill': '' })}
                    style={selected ? S.filesPill : S.filesPillIdle}
                    title={meta.label}
                    onClick={() => {
                      setActivePaneId(pane.id)
                      if (pane.kind === 'file') setTreeHidden(false)
                    }}
                  >
                    <Icon />
                    {meta.label}
                    <span
                      style={S.paneClose}
                      title="关闭"
                      aria-label={`关闭 ${meta.label}`}
                      onClick={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        closePane(pane.id)
                      }}
                    >
                      <CloseGlyph />
                    </span>
                  </button>
                )
              })}
            </div>
            <AddPaneMenu
              files={knownFiles}
              onOpenFile={(path) => void openPath(path)}
              onAddPane={addPane}
            />
          </div>
          <div style={S.chromeGroup}>
            <button type="button" style={S.iconBtn} title="收起工作台" onClick={() => toggleCollapsed()}>
              <WorkbenchToggleIcon />
            </button>
          </div>
        </div>
      </div>

      <section style={{ ...S.pane, gridColumn: 1, gridRow: 2 }}>
        {showEditorChrome ? (
        <div style={S.chrome}>
          <div style={S.chromeGroup}>
            <button type="button" style={S.iconBtn} title="后退" disabled={histIndex <= 0} onClick={() => goHistory(-1)}>
              <ChromeIcon title="后退" d="M10.5 3.5 5.5 8l5 4.5" />
            </button>
            <button type="button" style={S.iconBtn} title="前进" disabled={histIndex < 0 || histIndex >= histStack.length - 1} onClick={() => goHistory(1)}>
              <ChromeIcon title="前进" d="M5.5 3.5 10.5 8l-5 4.5" />
            </button>
          </div>
          <div style={S.filesTabs}>
            {tabs.map((path) => (
              <div key={path} style={{ ...S.tab, ...(active === path ? S.tabActive : {}) }} title={path}>
                {isDirty(contents.get(path)) ? <span style={S.dirtyDot} title="未保存" /> : null}
                <FileKindIcon name={basename(path)} />
                <button type="button" style={S.tabName} onClick={() => void openPath(path)}>
                  {basename(path)}
                </button>
                <button
                  type="button"
                  style={S.tabClose}
                  title="关闭"
                  aria-label={`关闭 ${basename(path)}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    closeTab(path)
                  }}
                >
                  <CloseGlyph />
                </button>
              </div>
            ))}
          </div>
          <div style={S.chromeGroup}>
            <MoreMenu
              canRename={Boolean(selected || active)}
              canCopy={Boolean(selected || active)}
              canCopyContent={Boolean(selected || active) && !isDirectoryPath(selected || active, childrenMap)}
              busy={busy}
              onRename={startRename}
              onCopyRelative={() => void copyRelative()}
              onCopyFull={() => void copyFull()}
              onCopyName={() => void copyName()}
              onCopyContent={() => void copyContent()}
              copyContentLabel={isImagePath(selected || active) ? '复制图片' : '复制内容'}
              onRefresh={() => void refreshAll()}
            />
            <button type="button" style={S.iconBtn} title="搜索文件" onClick={() => { setTreeHidden(false); setSearchOpen((open) => !open) }}>
              <ChromeIcon title="搜索" d="M7 11.5a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9zM10.2 10.2 13.5 13.5" />
            </button>
          </div>
        </div>
        ) : null}

        {!root ? (
          <div style={S.empty}>这条对话还没有工作目录</div>
        ) : isFiles && !active ? (
          <div style={{ flex: 1, minHeight: 0 }} />
        ) : isFiles && viewing?.image ? (
          <div style={S.mediaPane}>
            <div style={S.previewBar}>
              <button
                type="button"
                style={S.modeBtn}
                onClick={() => patchPane(activePane.id, (current) => ({ ...current, hexMode: !current.hexMode }))}
              >
                {hexMode ? '查看图片' : '查看二进制'}
              </button>
            </div>
            <TruncationNote file={viewing} />
            {hexMode ? (
              <pre style={S.hex}>{formatHexDump(viewing.bytes)}</pre>
            ) : viewing.dataUrl ? (
              <div style={S.previewWrap}>
                <img
                  alt=""
                  src={viewing.dataUrl}
                  style={S.previewImage}
                  onCopy={(event) => {
                    event.preventDefault()
                    void copyContent(active)
                  }}
                />
              </div>
            ) : (
              <div style={S.empty}>正在打开…</div>
            )}
          </div>
        ) : viewing?.binary ? (
          <div style={S.mediaPane}>
            <TruncationNote file={viewing} />
            <pre style={S.hex}>{formatHexDump(viewing.bytes)}</pre>
          </div>
        ) : viewing?.text !== undefined ? (
          <div style={S.mediaPane}>
            <TruncationNote file={viewing} />
            {viewing.truncated ? (
              <pre style={S.pre}>{viewing.text}</pre>
            ) : (
              <CodeEditor
                key={activePane.id}
                path={active}
                text={viewing.text}
                onChange={(text) => updateDraft(active, text)}
                onSave={() => void savePath(active)}
              />
            )}
          </div>
        ) : isFiles ? (
          <div style={S.empty}>正在打开…</div>
        ) : activePane?.kind === 'terminal' ? null : (
          <div style={S.empty}>
            <div style={S.emptyTitle}>{(PANE_META[activePane?.kind]?.label ?? '这个面板')}还没做</div>
          </div>
        )}
        {root ? panes.filter((pane) => pane.kind === 'terminal').map((pane) => (
          <div
            key={pane.id}
            style={{
              display: activePane?.id === pane.id ? 'flex' : 'none',
              flex: 1,
              minHeight: 0,
              flexDirection: 'column',
              background: 'var(--dsw-alias-bg-base, #fff)',
            }}
          >
            <TerminalView cwd={root} paneId={pane.id} active={activePane?.id === pane.id} />
          </div>
        )) : null}
      </section>

      {showTree ? (
        <>
          <button type="button" data-dsh-grip="tree" title="左右拖动调整资源管理器宽度" style={{ ...S.grip, position: 'relative', width: 4, flex: 'none', gridColumn: 2, gridRow: 2, alignSelf: 'stretch' }} onPointerDown={onResizeTree} />
          <aside
            style={{ ...S.tree, gridColumn: 3, gridRow: 2, minWidth: 0, width: 'auto' }}
            onContextMenu={(event) => event.preventDefault()}
          >
            <div style={S.header}>
              <span>{rootName}</span>
              <span style={{ display: 'flex', gap: 0 }}>
                <button type="button" style={S.iconBtn} title="新建文件" onClick={() => startCreate('file')}>
                  <ChromeIcon title="新建文件" d="M4 2.5h5L12 5.5V13.5H4z M8 8v4 M6 10h4" />
                </button>
                <button type="button" style={S.iconBtn} title="新建文件夹" onClick={() => startCreate('folder')}>
                  <ChromeIcon title="新建文件夹" d="M2.5 13V4.5h3.4L7.4 3h6.1v10z M8 7v4 M6 9h4" />
                </button>
                <button type="button" style={S.iconBtn} title="刷新" onClick={() => void refreshAll()} disabled={busy}>
                  <ChromeIcon title="刷新" d="M3 8a5 5 0 0 1 9-2.5 M13 3.5v3h-3 M13 8a5 5 0 0 1-9 2.5 M3 12.5v-3h3" />
                </button>
              </span>
            </div>
            {searchOpen ? (
              <input
                ref={searchRef}
                style={S.search}
                placeholder="搜索文件名"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setFilter('')
                    setSearchOpen(false)
                  }
                }}
              />
            ) : null}
            {error && !creating ? <div style={S.notice}>{error}</div> : null}
            {!root ? (
              <div style={{ ...S.empty, marginTop: 24 }}>没有工作目录</div>
            ) : rootEntries.length === 0 && !error ? (
              <div style={{ ...S.empty, marginTop: 24 }}>没有文件</div>
            ) : (
              <div style={{ overflow: 'auto', flex: 1, paddingBottom: 8 }}>
                <TreeRows
                  path=""
                  depth={0}
                  childrenMap={childrenMap}
                  expanded={expanded}
                  selected={selected}
                  filter={filter}
                  git={git}
                  onToggle={onToggle}
                  onOpen={(path) => void openPath(path)}
                  onContextMenu={openTreeMenu}
                  rename={{
                    path: renaming,
                    draft: renameDraft,
                    onDraft: setRenameDraft,
                    onSubmit: submitRename,
                    onCancel: () => setRenaming(undefined),
                  }}
                />
              </div>
            )}
          </aside>
        </>
      ) : null}

      {ctxMenu ? (
        <div style={{ gridColumn: 1, gridRow: 1, width: 0, height: 0, overflow: 'visible' }}>
        <FileContextMenu
          key={`${ctxMenu.path}:${ctxMenu.x}:${ctxMenu.y}`}
          x={ctxMenu.x}
          y={ctxMenu.y}
          canRename
          canCopy
          canCopyContent={!ctxMenu.directory}
          busy={busy}
          onClose={() => setCtxMenu(undefined)}
          onRename={() => startRename(ctxMenu.path)}
          onCopyRelative={() => void copyRelative(ctxMenu.path)}
          onCopyFull={() => void copyFull(ctxMenu.path)}
          onCopyName={() => void copyName(ctxMenu.path)}
          onCopyContent={() => void copyContent(ctxMenu.path)}
          copyContentLabel={isImagePath(ctxMenu.path) ? '复制图片' : '复制内容'}
          onRefresh={() => void refreshAll()}
        />
        </div>
      ) : null}

      <nav data-dsh-rail="" style={{ ...S.rail, gridColumn: railColumn, gridRow: 2 }} aria-label="工作台切换">
        <button
          type="button"
          title="文件树"
          aria-label="文件树"
          aria-pressed={showTree}
          style={{ ...S.railBtn, ...(showTree ? S.railBtnActive : {}) }}
          onClick={toggleTree}
        >
          <FilesActivityIcon />
        </button>
        <button
          type="button"
          title="终端"
          aria-label="终端"
          aria-pressed={activePane?.kind === 'terminal'}
          style={{ ...S.railBtn, ...(activePane?.kind === 'terminal' ? S.railBtnActive : {}) }}
          onClick={() => focusOrAddPane('terminal')}
        >
          <TerminalActivityIcon />
        </button>
      </nav>
      {creating ? (
        <CreateDialog
          kind={creating.kind}
          folderLabel={creating.dir ? basename(creating.dir) : rootName}
          name={draftName}
          error={error}
          onName={setDraftName}
          onSubmit={submitCreate}
          onClose={() => {
            setCreating(undefined)
            setDraftName('')
            setError(undefined)
          }}
        />
      ) : null}
    </div>
  )
}

export function HeaderToggle() {
  const collapsed = useSyncExternalStore(subscribeVisibility, () => isCollapsed())
  const prefs = useSyncExternalStore(subscribePrefs, getPrefs)
  if (!prefs.enabled || !collapsed) return null
  return (
    <button
      type="button"
      data-dsh-side-panels-toggle=""
      title="展开工作台"
      aria-pressed={false}
      onClick={() => toggleCollapsed()}
    >
      <WorkbenchToggleIcon />
    </button>
  )
}
