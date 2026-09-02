import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { findChrome } from '../src/host/browser-chrome.js'
import { createBrowserHub } from '../src/host/browser-session.js'

describe('独立浏览器', { skip: !findChrome() }, () => {
  it('能用单独档案打开空白页并读到页面结构', async () => {
    const hub = createBrowserHub()
    try {
      const runtime = await hub.get(`smoke-${Date.now()}`, { width: 480, height: 320 })
      const state = await runtime.apply({ type: 'navigate', url: 'about:blank' })
      assert.equal(state.url, 'about:blank')
      const snap = await runtime.apply({ type: 'snapshot' })
      assert.equal(typeof snap.text, 'string')
      const shot = await runtime.apply({ type: 'screenshot' })
      assert.equal(typeof shot.data, 'string')
      assert.ok(shot.data.length > 20)
    } finally {
      await hub.closeAll()
    }
  })
})
