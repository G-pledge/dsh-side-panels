import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { homedir } from 'node:os'
import {
  findChrome, isAllowedUrl, normalizeNavigateUrl, profileDir, sessionKey,
} from '../src/host/browser-chrome.js'

describe('浏览器档案', () => {
  it('两条对话不会共用同一份登录本', () => {
    const a = sessionKey('talk-1')
    const b = sessionKey('talk-2')
    assert.notEqual(a, b)
    assert.notEqual(profileDir('talk-1'), profileDir('talk-2'))
  })

  it('档案落在插件自己的目录，不碰日常 Chrome', () => {
    const dir = profileDir('talk-1').replaceAll('\\', '/')
    assert.equal(dir.includes('.dsh-side-panels/browser-profiles'), true)
    assert.equal(dir.startsWith(homedir().replaceAll('\\', '/')), true)
    assert.equal(/Google\/Chrome\/User Data/i.test(dir), false)
    assert.equal(/Microsoft\/Edge\/User Data/i.test(dir), false)
  })

  it('同一条对话每次都指到同一目录', () => {
    assert.equal(sessionKey('abc/会话'), sessionKey('abc/会话'))
    assert.equal(profileDir('abc/会话'), profileDir('abc/会话'))
  })
})

describe('打开网址', () => {
  it('没写协议就补成 https', () => {
    const result = normalizeNavigateUrl('example.com')
    assert.equal(result.ok, true)
    assert.equal(result.url, 'https://example.com/')
  })

  it('拦住本机文件和脚本地址', () => {
    assert.equal(isAllowedUrl('file:///C:/secret.txt'), false)
    assert.equal(isAllowedUrl('javascript:alert(1)'), false)
    assert.equal(normalizeNavigateUrl('about:blank').ok, true)
    assert.equal(normalizeNavigateUrl('https://example.com').ok, true)
  })
})

describe('本机浏览器', () => {
  it('能找到 Chrome 或 Edge 就记下路径', () => {
    const path = findChrome()
    assert.equal(typeof path, 'string')
  })
})
