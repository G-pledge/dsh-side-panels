import React, { useState } from 'react'
import { formatProxyAddr, PROXY_DIRECT, PROXY_SYSTEM, PROXY_TYPES, sanitizeProxyProfile } from '../shared/browser-proxy.js'
import { PencilIcon, TrashIcon } from './icons.jsx'
import { S } from './styles.js'

const EMPTY = { name: '', type: 'http', host: '', port: '', bypass: '' }

function typeLabel(type) {
  if (type === 'socks5') return 'socks5'
  if (type === 'socks4') return 'socks4'
  return 'http'
}

export function BrowserProxyPanel({ activeId, profiles, onSelect, onCommit, onDelete }) {
  const [form, setForm] = useState(EMPTY)
  const [editId, setEditId] = useState('')
  const [hint, setHint] = useState('')

  const patch = (field, value) => {
    setHint('')
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const resetForm = () => {
    setEditId('')
    setForm(EMPTY)
    setHint('')
  }

  const save = () => {
    const next = sanitizeProxyProfile({
      ...form,
      port: form.port === '' ? NaN : Number(form.port),
    }, editId)
    if (!next.ok) {
      setHint(next.error)
      return
    }
    onCommit(next.profile, Boolean(editId))
    resetForm()
  }

  const startEdit = (profile) => {
    setEditId(profile.id)
    setForm({
      name: profile.name,
      type: typeLabel(profile.type),
      host: profile.host,
      port: String(profile.port),
      bypass: profile.bypass || '',
    })
    setHint('')
  }

  return (
    <div style={S.browserProxy} role="dialog" aria-label="代理切换">
      <div style={S.browserProxyHead}>代理切换</div>
      <button
        type="button"
        style={{ ...S.browserProxyRow, ...(activeId === PROXY_DIRECT ? S.browserProxyRowOn : {}) }}
        onClick={() => onSelect(PROXY_DIRECT)}
      >
        <span style={S.browserProxyName}>直接连接</span>
        <span style={S.browserProxyMeta}>不使用代理</span>
      </button>
      <button
        type="button"
        style={{ ...S.browserProxyRow, ...(activeId === PROXY_SYSTEM ? S.browserProxyRowOn : {}) }}
        onClick={() => onSelect(PROXY_SYSTEM)}
      >
        <span style={S.browserProxyName}>系统代理</span>
        <span style={S.browserProxyMeta}>系统设置</span>
      </button>
      {profiles.map((row) => {
        const on = activeId === row.id
        return (
          <div key={row.id} style={{ ...S.browserProxyCustom, ...(on ? S.browserProxyRowOn : {}) }}>
            <button type="button" style={S.browserProxyPick} onClick={() => onSelect(row.id)}>
              <span style={S.browserProxyName}>
                {on ? <span style={S.browserProxyDot} /> : null}
                {row.name}
              </span>
              <span style={S.browserProxyMeta}>{formatProxyAddr(row)}</span>
            </button>
            <button
              type="button"
              style={S.browserProxyIconBtn}
              title="改这条"
              aria-label={`改 ${row.name}`}
              onClick={(event) => {
                event.stopPropagation()
                startEdit(row)
              }}
            >
              <PencilIcon />
            </button>
            <button
              type="button"
              style={S.browserProxyIconBtn}
              title="删除这条"
              aria-label={`删除 ${row.name}`}
              onClick={(event) => {
                event.stopPropagation()
                if (editId === row.id) resetForm()
                onDelete(row.id)
              }}
            >
              <TrashIcon />
            </button>
          </div>
        )
      })}
      <div style={S.browserProxyForm}>
        <div style={S.browserProxyFields}>
          <input
            style={S.browserProxyInput}
            value={form.name}
            spellCheck={false}
            placeholder="代理名称"
            onChange={(event) => patch('name', event.target.value)}
          />
          <select
            style={S.browserProxySelect}
            value={form.type}
            onChange={(event) => patch('type', event.target.value)}
          >
            {PROXY_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div style={S.browserProxyFields}>
          <input
            style={S.browserProxyInput}
            value={form.host}
            spellCheck={false}
            placeholder="主机地址"
            onChange={(event) => patch('host', event.target.value)}
          />
          <input
            style={S.browserProxyPort}
            value={form.port}
            spellCheck={false}
            inputMode="numeric"
            placeholder="端口"
            onChange={(event) => patch('port', event.target.value.replace(/[^\d]/g, '').slice(0, 5))}
          />
        </div>
        <textarea
          style={S.browserProxyBypass}
          value={form.bypass}
          spellCheck={false}
          placeholder={'不使用代理的地址，每行一个，例如：\n*.example.com'}
          onChange={(event) => patch('bypass', event.target.value)}
        />
        {hint ? <div style={S.browserProxyHint}>{hint}</div> : null}
        <div style={S.browserProxyActions}>
          {editId ? (
            <button type="button" style={S.browserDlBtn} onClick={resetForm}>
              取消
            </button>
          ) : null}
          <button type="button" data-dsh-browser-primary="" style={S.browserProxyAdd} onClick={save}>
            {editId ? '保存' : '添加'}
          </button>
        </div>
      </div>
    </div>
  )
}
