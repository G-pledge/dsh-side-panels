import React, { useEffect, useSyncExternalStore } from 'react'
import { getPrefs, setPref, subscribePrefs } from './prefs.js'
import { SETTINGS_STYLE } from './styles.js'

const SHELL_HINT = {
  auto: '有新版 PowerShell 就用它，没有再用系统自带的。',
  cmd: '固定打开命令提示符。',
  powershell: '优先新版 PowerShell，没有就用系统自带的。',
  custom: '填本机程序，比如 D:\\cmder\\Cmder.exe。',
}

function ensureSettingsCss() {
  if (typeof document === 'undefined') return
  let style = document.querySelector('style[data-dsh-side-panels-settings]')
  if (!style) {
    style = document.createElement('style')
    style.dataset.dshSidePanelsSettings = ''
    document.head.appendChild(style)
  }
  style.textContent = SETTINGS_STYLE
}

function Row({ title, hint, children }) {
  return (
    <div className="dsh-sp-row">
      <div className="dsh-sp-copy">
        <div className="dsh-sp-title">{title}</div>
        {hint ? <div className="dsh-sp-hint">{hint}</div> : null}
      </div>
      {children}
    </div>
  )
}

function Switch({ on, label, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      className="dsh-sp-switch"
      aria-label={label}
      aria-checked={on}
      data-on={on ? 'true' : 'false'}
      onClick={() => onChange(!on)}
    />
  )
}

function PathField({ value, onCommit }) {
  return (
    <input
      className="dsh-sp-path"
      value={value}
      spellCheck={false}
      placeholder="D:\cmder\Cmder.exe"
      onChange={(event) => onCommit(event.target.value)}
    />
  )
}

export function SettingsPage() {
  const prefs = useSyncExternalStore(subscribePrefs, getPrefs)
  useEffect(() => {
    ensureSettingsCss()
  }, [])
  return (
    <div data-dsh-settings-page="">
      <p className="dsh-sp-lede">不用点保存，改完就记下。换终端后，把终端页关掉再开一次。</p>
      <Row title="显示工作台" hint="关掉后，对话旁边不再出现这套面板。">
        <Switch on={prefs.enabled} label="显示工作台" onChange={(on) => void setPref('enabled', on)} />
      </Row>
      <Row title="新对话默认收起" hint="新开一条对话时，工作台先收起来。">
        <Switch on={prefs.startCollapsed} label="新对话默认收起" onChange={(on) => void setPref('startCollapsed', on)} />
      </Row>
      <div className="dsh-sp-group">
        <div className="dsh-sp-row" style={{ padding: 0, border: 'none' }}>
          <div className="dsh-sp-copy">
            <div className="dsh-sp-title">默认终端</div>
            <div className="dsh-sp-hint">{SHELL_HINT[prefs.shell] ?? SHELL_HINT.auto}</div>
          </div>
          <select
            className="dsh-sp-select"
            value={prefs.shell}
            onChange={(event) => void setPref('shell', event.target.value)}
          >
            <option value="auto">自动</option>
            <option value="cmd">命令提示符</option>
            <option value="powershell">PowerShell</option>
            <option value="custom">自定义</option>
          </select>
        </div>
        {prefs.shell === 'custom' ? (
          <PathField value={prefs.customPath} onCommit={(next) => void setPref('customPath', next)} />
        ) : null}
      </div>
      <div className="dsh-sp-group">
        <div className="dsh-sp-title">终端配色</div>
        <div className="dsh-sp-cubes" role="radiogroup" aria-label="终端配色">
          <button
            type="button"
            role="radio"
            className="dsh-sp-cube"
            aria-checked={prefs.terminalTheme === 'follow'}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void setPref('terminalTheme', 'follow')}
          >
            跟随平台
            <small>浅色浅底，深色深底</small>
          </button>
          <button
            type="button"
            role="radio"
            className="dsh-sp-cube"
            aria-checked={prefs.terminalTheme === 'dark'}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void setPref('terminalTheme', 'dark')}
          >
            始终深色
            <small>黑底亮字</small>
          </button>
        </div>
      </div>
      <div className="dsh-sp-group" style={{ borderBottom: 'none' }}>
        <div className="dsh-sp-title">浏览器调试</div>
        <div className="dsh-sp-hint" style={{ marginBottom: 10 }}>点地址栏那个控制台图标时，调试区怎么出现。</div>
        <div className="dsh-sp-cubes" role="radiogroup" aria-label="浏览器调试">
          <button
            type="button"
            role="radio"
            className="dsh-sp-cube"
            aria-checked={prefs.devtoolsMode !== 'detach'}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void setPref('devtoolsMode', 'bottom')}
          >
            贴在网页底下
            <small>面板里官方调试器，和 Chrome 按 F12 同一套</small>
          </button>
          <button
            type="button"
            role="radio"
            className="dsh-sp-cube"
            aria-checked={prefs.devtoolsMode === 'detach'}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => void setPref('devtoolsMode', 'detach')}
          >
            弹出窗口
            <small>单独开一个调试窗</small>
          </button>
        </div>
      </div>
    </div>
  )
}
