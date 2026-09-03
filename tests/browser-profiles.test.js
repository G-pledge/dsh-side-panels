import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { homedir } from 'node:os'
import { partitionName, profileDir, sessionKey } from '../src/host/browser-chrome.js'
import { forgetVisit, formatVisitTime, isHistoryUrl, rememberVisit, touchVisitTitle } from '../src/shared/browser-history.js'
import { faviconListFromEvent, isAllowedUrl, normalizeNavigateUrl, pickTabIcon, shouldShowLoadError, tabLabel } from '../src/shared/browser-id.js'
import { readDevtoolsMode } from '../src/client/prefs.js'
import { createBrowserHub } from '../src/host/browser-session.js'

describe('浏览器档案', () => {
  it('两条对话不会共用同一份登录本', () => {
    assert.notEqual(sessionKey('talk-1'), sessionKey('talk-2'))
    assert.notEqual(partitionName('talk-1'), partitionName('talk-2'))
    assert.notEqual(profileDir('talk-1'), profileDir('talk-2'))
  })

  it('嵌页档案名不碰日常 Chrome', () => {
    const name = partitionName('talk-1')
    assert.equal(name.startsWith('persist:dsh-sp-'), true)
    const dir = profileDir('talk-1').replaceAll('\\', '/')
    assert.equal(dir.startsWith(homedir().replaceAll('\\', '/')), true)
    assert.equal(/Google\/Chrome\/User Data/i.test(dir), false)
  })

  it('同一条对话每次都指到同一目录', () => {
    assert.equal(sessionKey('abc/会话'), sessionKey('abc/会话'))
    assert.equal(partitionName('abc/会话'), partitionName('abc/会话'))
  })
})

describe('标签名字', () => {
  it('空白页显示新标签', () => {
    assert.equal(tabLabel('about:blank', ''), '新标签')
    assert.equal(tabLabel('about:blank', '新标签'), '新标签')
  })

  it('不会把新标签四个字当成网页标题留下', () => {
    assert.equal(tabLabel('https://ip138.com/', '新标签'), 'ip138.com')
  })

  it('有网页标题就用网页标题', () => {
    assert.equal(tabLabel('https://ip138.com/', '查询网 iP138.com'), '查询网 iP138.com')
  })

  it('能用网站给的图标', () => {
    assert.equal(pickTabIcon(['https://www.baidu.com/favicon.ico'], 'https://www.baidu.com/'), 'https://www.baidu.com/favicon.ico')
    assert.equal(pickTabIcon([], 'https://www.baidu.com/search'), 'https://www.baidu.com/favicon.ico')
    assert.equal(pickTabIcon([], 'about:blank'), '')
    assert.deepEqual(faviconListFromEvent({ favicons: ['https://www.baidu.com/favicon.ico'] }), ['https://www.baidu.com/favicon.ico'])
    assert.deepEqual(faviconListFromEvent({ detail: ['https://www.baidu.com/favicon.ico'] }), ['https://www.baidu.com/favicon.ico'])
  })
})

describe('打开失败提示', () => {
  it('页面里的小框失败不提示', () => {
    assert.equal(shouldShowLoadError({ isMainFrame: false, errorCode: -2 }), false)
  })

  it('整页取消加载不提示', () => {
    assert.equal(shouldShowLoadError({ isMainFrame: true, errorCode: -3 }), false)
  })

  it('整页真失败才提示', () => {
    assert.equal(shouldShowLoadError({ isMainFrame: true, errorCode: -105, validatedURL: 'https://ip138.com/' }), true)
  })
})

describe('浏览器调试开法', () => {
  it('默认贴在网页底下', () => {
    assert.equal(readDevtoolsMode({}), 'bottom')
    assert.equal(readDevtoolsMode({ devtoolsMode: 'bottom' }), 'bottom')
  })

  it('能选弹出窗口', () => {
    assert.equal(readDevtoolsMode({ devtoolsMode: 'detach' }), 'detach')
  })
})

describe('浏览历史', () => {
  it('空白页和本机文件不进历史', () => {
    assert.equal(isHistoryUrl('about:blank'), false)
    assert.equal(isHistoryUrl('file:///C:/secret.txt'), false)
    assert.equal(isHistoryUrl('https://ip138.com/'), true)
  })

  it('同一网址再打开会顶到最上', () => {
    const first = rememberVisit([], { url: 'https://ip138.com/', title: '查询网', at: 1 })
    const second = rememberVisit(first, { url: 'https://example.com/', title: 'Example', at: 2 })
    const again = rememberVisit(second, { url: 'https://ip138.com/', title: '查询网 iP138.com', at: 3 })
    assert.equal(again[0].url, 'https://ip138.com/')
    assert.equal(again[0].title, '查询网 iP138.com')
    assert.equal(again.length, 2)
  })

  it('标题后到时只改字不换位置', () => {
    const list = rememberVisit([], { url: 'https://ip138.com/', title: '', at: 1 })
    const next = touchVisitTitle(list, 'https://ip138.com/', '查询网 iP138.com')
    assert.equal(next[0].title, '查询网 iP138.com')
    assert.equal(next[0].at, 1)
  })

  it('能单独删掉一条', () => {
    const list = rememberVisit(
      rememberVisit([], { url: 'https://ip138.com/', title: '查询网', at: 1 }),
      { url: 'https://www.baidu.com/', title: '百度一下，你就知道', at: 2 },
    )
    const next = forgetVisit(list, 'https://ip138.com/')
    assert.equal(next.length, 1)
    assert.equal(next[0].url, 'https://www.baidu.com/')
  })

  it('今天只显示几点几分', () => {
    const now = Date.parse('2026-09-03T15:20:00')
    assert.equal(formatVisitTime(Date.parse('2026-09-03T09:08:00'), now), '09:08')
    assert.equal(formatVisitTime(Date.parse('2026-09-02T21:00:00'), now), '昨天 21:00')
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

describe('遥控通道', () => {
  it('没打开面板时会说明原因', async () => {
    const hub = createBrowserHub()
    const runtime = await hub.get('talk-1')
    await assert.rejects(() => runtime.apply({ type: 'snapshot' }), /先打开浏览器面板/)
  })
})
