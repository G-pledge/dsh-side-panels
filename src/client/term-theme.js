import { getPrefs, subscribePrefs } from './prefs.js'

function resolved(cssVar, fallback, channel) {
  if (typeof document === 'undefined') return fallback
  const probe = document.createElement('div')
  probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;${channel}:var(${cssVar},${fallback})`
  document.body.appendChild(probe)
  const value = getComputedStyle(probe)[channel === 'background-color' ? 'backgroundColor' : 'color']
  probe.remove()
  if (!value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)') return fallback
  return value
}

function luminance(color) {
  const match = String(color).match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/)
  if (!match) return 1
  const toLin = (value) => {
    const channel = Number(value) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * toLin(match[1]) + 0.7152 * toLin(match[2]) + 0.0722 * toLin(match[3])
}

const LIGHT_ANSI = {
  black: '#1e1e1e',
  red: '#b42318',
  green: '#166534',
  yellow: '#7d5a00',
  blue: '#175cd3',
  magenta: '#7e22ce',
  cyan: '#0e7490',
  white: '#4b5563',
  brightBlack: '#6b7280',
  brightRed: '#b42318',
  brightGreen: '#15803d',
  brightYellow: '#854d0e',
  brightBlue: '#1d4ed8',
  brightMagenta: '#6d28d9',
  brightCyan: '#0f766e',
  brightWhite: '#1f2937',
}

const DARK_ANSI = {
  black: '#0d0d0d',
  red: '#f14c4c',
  green: '#23d18b',
  yellow: '#e5e510',
  blue: '#3b8eea',
  magenta: '#d670d6',
  cyan: '#29b8db',
  white: '#e5e5e5',
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#e5e5e5',
}

export function readTermTheme() {
  if (getPrefs().terminalTheme === 'dark') {
    return {
      background: '#1e1e1e',
      foreground: '#cccccc',
      cursor: '#cccccc',
      cursorAccent: '#1e1e1e',
      selectionBackground: '#264f78',
      selectionForeground: '#ffffff',
      ...DARK_ANSI,
    }
  }
  const background = resolved('--dsw-alias-bg-base', '#ffffff', 'background-color')
  const foreground = resolved('--dsw-alias-fg-default', '#3c3c3c', 'color')
  const selection = resolved('--dsw-alias-bg-multi-select', '#c5d4e8', 'background-color')
  const ansi = luminance(background) > 0.5 ? LIGHT_ANSI : DARK_ANSI
  return {
    background,
    foreground,
    cursor: foreground,
    cursorAccent: background,
    selectionBackground: selection,
    selectionForeground: foreground,
    ...ansi,
  }
}

export function readTermFont() {
  if (typeof getComputedStyle !== 'function' || typeof document === 'undefined') {
    return 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  }
  const stack = getComputedStyle(document.body ?? document.documentElement).getPropertyValue('--ds-font-family-code').trim()
  return stack || 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
}

export function watchTermTheme(apply) {
  if (typeof document === 'undefined') return () => {}
  let timer
  const run = () => {
    clearTimeout(timer)
    timer = setTimeout(() => apply(readTermTheme(), readTermFont()), 40)
  }
  const observer = new MutationObserver(run)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-dsh-skin', 'data-dsh-custom-theme'] })
  if (document.body) {
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-ds-dark-theme', 'data-theme'] })
  }
  observer.observe(document.head, { childList: true })
  const media = window.matchMedia?.('(prefers-color-scheme: dark)')
  media?.addEventListener?.('change', run)
  const stopPrefs = subscribePrefs(run)
  run()
  return () => {
    clearTimeout(timer)
    observer.disconnect()
    media?.removeEventListener?.('change', run)
    stopPrefs()
  }
}
