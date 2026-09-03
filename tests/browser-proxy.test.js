import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildBypassRules,
  buildProxyRules,
  formatProxyAddr,
  isProxyHost,
  readProxyActive,
  readProxyProfiles,
  sanitizeProxyProfile,
  toSessionProxy,
} from '../src/shared/browser-proxy.js'

describe('嵌页代理', () => {
  it('不认带协议或路径的主机', () => {
    assert.equal(isProxyHost('127.0.0.1'), true)
    assert.equal(isProxyHost('localhost'), true)
    assert.equal(isProxyHost('http://127.0.0.1'), false)
    assert.equal(isProxyHost('127.0.0.1:7897'), false)
  })

  it('http 和 socks5 能拼成规则', () => {
    assert.equal(buildProxyRules({ host: '127.0.0.1', port: 7897, type: 'http' }).rules, 'http://127.0.0.1:7897')
    assert.equal(buildProxyRules({ host: '127.0.0.1', port: 1080, type: 'socks5' }).rules, 'socks5://127.0.0.1:1080')
    assert.equal(buildProxyRules({ host: '127.0.0.1', port: 0, type: 'http' }).ok, false)
  })

  it('绕过名单会带上本机并去重', () => {
    const rules = buildBypassRules('localhost\n*.example.com\n127.0.0.1')
    assert.equal(rules.includes('*.example.com'), true)
    assert.equal(rules.startsWith('localhost,127.0.0.1,::1,<local>'), true)
    assert.equal(rules.split(',').filter((row) => row === 'localhost').length, 1)
  })

  it('缺名称加不进去', () => {
    const next = sanitizeProxyProfile({ name: '  ', host: '127.0.0.1', port: 7897 })
    assert.equal(next.ok, false)
  })

  it('选中的自定义代理会带上绕过名单', () => {
    const saved = sanitizeProxyProfile({
      id: 'px-vpn',
      name: 'vpn',
      type: 'http',
      host: '127.0.0.1',
      port: 7897,
      bypass: '*.example.com',
    })
    assert.equal(saved.ok, true)
    const next = toSessionProxy('px-vpn', [saved.profile])
    assert.equal(next.ok, true)
    assert.equal(next.config.mode, 'fixed_servers')
    assert.equal(next.config.proxyRules, 'http://127.0.0.1:7897')
    assert.equal(next.config.proxyBypassRules.includes('*.example.com'), true)
  })

  it('直接连接和系统代理不用填地址', () => {
    assert.equal(toSessionProxy('direct', []).config.mode, 'direct')
    assert.equal(toSessionProxy('system', []).config.mode, 'system')
  })

  it('删掉的那条会退回系统代理', () => {
    assert.equal(readProxyActive('px-gone', []), 'system')
    assert.equal(formatProxyAddr({ host: '127.0.0.1', port: 7897, type: 'http' }), 'http://127.0.0.1:7897')
    assert.equal(readProxyProfiles('not-json').length, 0)
  })
})
