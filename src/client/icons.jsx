import React from 'react'

export function extOf(name) {
  const base = String(name).toLowerCase()
  if (base === '.gitignore' || base.endsWith('.gitignore')) return 'gitignore'
  const dot = base.lastIndexOf('.')
  if (dot <= 0) return ''
  return base.slice(dot + 1)
}

export function gitColor(letter) {
  if (letter === 'U' || letter === 'A') return '#3ba55d'
  if (letter === 'M') return '#e2b53e'
  if (letter === 'D') return '#e05252'
  return '#6a9a73'
}

export function FileKindIcon({ name, directory, open }) {
  if (directory) {
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path
          fill={open ? '#dcb67a' : '#c9a66b'}
          d={open ? 'M1.5 13V5.2h3.4L6.4 3.8h8.1V13z' : 'M1.5 13V4.4h3.6L6.6 3h8V13z'}
        />
        <path fill={open ? '#e8c992' : '#d4b07a'} d={open ? 'M1.5 6.2h13V13h-13z' : 'M1.5 5.6h13V13h-13z'} />
      </svg>
    )
  }
  const ext = extOf(name)
  if (ext === 'gitignore') {
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path fill="#f05133" d="M8 1.6 14.2 8 8 14.4 1.8 8z" />
      </svg>
    )
  }
  const badge = {
    ts: { bg: '#3178c6', text: 'TS' },
    tsx: { bg: '#3178c6', text: 'TS' },
    js: { bg: '#cbcb41', text: 'JS', fg: '#333' },
    jsx: { bg: '#cbcb41', text: 'JS', fg: '#333' },
    mjs: { bg: '#cbcb41', text: 'JS', fg: '#333' },
    json: { bg: '#8bc34a', text: '{}' },
    yml: { bg: '#cb171e', text: 'Y' },
    yaml: { bg: '#cb171e', text: 'Y' },
    md: { bg: '#519aba', text: 'M' },
    css: { bg: '#563d7c', text: '#' },
    html: { bg: '#e44d26', text: '<>' },
  }[ext] ?? { bg: '#6c7780', text: '·' }
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="2" fill={badge.bg} />
      <text
        x="8"
        y="11"
        textAnchor="middle"
        fill={badge.fg ?? '#fff'}
        fontSize={badge.text.length > 1 ? 6.5 : 8}
        fontFamily="ui-sans-serif, system-ui, sans-serif"
        fontWeight="700"
      >
        {badge.text}
      </text>
    </svg>
  )
}

/** 右侧活动栏：两张叠着的纸，和 Cursor 文件树按钮同一类。 */
export function FilesActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="4" y="7" width="11" height="14" rx="1.4" />
      <path d="M9 7V4.4A1.4 1.4 0 0 1 10.4 3H19.6A1.4 1.4 0 0 1 21 4.4V17.6A1.4 1.4 0 0 1 19.6 19H15" />
    </svg>
  )
}

/** 右侧活动栏：终端。 */
export function TerminalActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <path d="M7 10.5 10 13 7 15.5 M12.5 15.5H17" />
    </svg>
  )
}

/** 地址栏 F12：命令行提示符。 */
export function ConsolePromptIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3.5 4.2 7.2 8 3.5 11.8" />
      <path d="M8.2 12.2h4.6" />
    </svg>
  )
}

/** 右侧活动栏：浏览器。 */
export function BrowserActivityIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <circle cx="12" cy="12" r="8.2" />
      <path d="M3.8 12h16.4 M12 3.8c2.2 2.4 3.4 4.9 3.4 8.2S14.2 17.8 12 20.2C9.8 17.8 8.6 15.3 8.6 12S9.8 6.2 12 3.8z" />
    </svg>
  )
}

/** Files 药丸上的单页图标。 */
export function FilesDocIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M4 2.5h5L12.5 6v7.5H4z" />
      <path d="M9 2.5V6h3.5" />
    </svg>
  )
}

export function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M8 3.2v9.6M3.2 8h9.6" />
    </svg>
  )
}

export function WorkbenchToggleIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <rect x="1.5" y="2.5" width="8.5" height="11" rx="1" />
      <rect x="11" y="2.5" width="3.5" height="11" rx="0.8" />
    </svg>
  )
}
