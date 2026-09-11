import React from 'react'
import { CodeEditor } from './CodeEditor.jsx'
import { S } from './styles.js'

function hunkPreview(hunk) {
  const line = (hunk.lines ?? []).find((item) => item.startsWith('+') && !item.startsWith('+++'))
    || (hunk.lines ?? []).find((item) => item.startsWith('-') && !item.startsWith('---'))
    || hunk.hunkHeader
  return String(line || '').slice(0, 80)
}

export function GitBlameView({ path, lines }) {
  const rows = Array.isArray(lines) ? lines : []
  if (rows.length === 0) {
    return <div style={S.empty}>没有归咎信息。文件可能还没提交过。</div>
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={S.gitCompareHead}>{path}</div>
      <div style={S.gitBlame}>
        {rows.map((line, index) => (
          <div key={`${line.hash}:${index}`} style={S.gitBlameLine} title={line.hash}>
            <span style={S.gitBlameMeta}>{String(line.hash || '').slice(0, 7)} {line.author || ''}</span>
            <span style={S.gitBlameText}>{line.text ?? ''}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GitCompare({
  path, before, after, leftTitle, rightTitle, binary, text, lfs, hunks, side, conflict,
  onStageHunk, onUnstageHunk, onDiscardHunk, onTakeOurs, onTakeTheirs,
}) {
  if (lfs) {
    return <div style={S.empty}>这是 Git LFS 指针文件，内容在 LFS 存储里</div>
  }
  if (binary) {
    return <div style={S.empty}>二进制文件，不能比差异</div>
  }
  const left = typeof before === 'string' ? before : ''
  const right = typeof after === 'string' ? after : (typeof text === 'string' ? text : '')
  const list = Array.isArray(hunks) ? hunks : []
  const canHunk = list.length > 0 && (side === 'worktree' || side === 'index')
  return (
    <div style={{ ...S.gitCompare, flexDirection: 'column' }}>
      {conflict ? (
        <div style={S.gitBanner}>
          <span>这个文件有冲突</span>
          {onTakeOurs ? <button type="button" style={S.gitLinkBtn} onClick={onTakeOurs}>采用当前</button> : null}
          {onTakeTheirs ? <button type="button" style={S.gitLinkBtn} onClick={onTakeTheirs}>采用传入</button> : null}
        </div>
      ) : null}
      {canHunk ? (
        <div style={S.gitHunkBar}>
          {list.map((hunk, index) => (
            <div key={`${hunk.hunkHeader}:${index}`} style={S.gitHunkRow}>
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {hunkPreview(hunk)}
              </span>
              {side === 'worktree' && onStageHunk ? (
                <button type="button" style={S.gitLinkBtn} onClick={() => onStageHunk(hunk)}>暂存这块</button>
              ) : null}
              {side === 'worktree' && onDiscardHunk ? (
                <button type="button" style={S.gitLinkBtn} onClick={() => onDiscardHunk(hunk)}>丢弃这块</button>
              ) : null}
              {side === 'index' && onUnstageHunk ? (
                <button type="button" style={S.gitLinkBtn} onClick={() => onUnstageHunk(hunk)}>取消暂存这块</button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
      <div style={{ ...S.gitCompare, flex: 1, minHeight: 0 }}>
        <div style={S.gitCompareCol}>
          <div style={S.gitCompareHead}>{leftTitle || '旧'}</div>
          <CodeEditor key={`left:${path}`} path={path} text={left} readOnly />
        </div>
        <div style={{ ...S.gitCompareCol, borderInlineStart: '1px solid var(--dsw-alias-border, #ececec)' }}>
          <div style={S.gitCompareHead}>{rightTitle || '新'}</div>
          <CodeEditor key={`right:${path}`} path={path} text={right} readOnly />
        </div>
      </div>
    </div>
  )
}
