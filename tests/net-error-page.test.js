import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildErrorPageHtml,
  describeHttpError,
  describeNetError,
  looksBlankPage,
  netErrorCodeName,
} from '../src/shared/net-error-page.js'

describe('失败页', () => {
  it('代理失败写出代理那句', () => {
    const next = describeNetError(-130, 'https://www.baidu.com/', 'net::ERR_PROXY_CONNECTION_FAILED')
    assert.equal(next.name, 'ERR_PROXY_CONNECTION_FAILED')
    assert.equal(next.title, '无法访问此网站')
    assert.match(next.detail, /代理/)
  })

  it('空回包写出没有数据', () => {
    const next = describeNetError(-324, 'https://www.baidu.com/')
    assert.equal(next.name, 'ERR_EMPTY_RESPONSE')
    assert.equal(next.title, '没有数据')
  })

  it('502 写出 HTTP ERROR 502', () => {
    const next = describeHttpError(502, 'https://www.baidu.com/')
    assert.equal(next.name, 'HTTP ERROR 502')
    assert.match(next.detail, /baidu.com/)
    const html = buildErrorPageHtml({ ...next, reloadUrl: 'https://www.baidu.com/' })
    assert.match(html, /HTTP ERROR 502/)
    assert.match(html, /重新加载/)
    assert.match(html, /button:active/)
  })

  it('有字的页不当成空白', () => {
    assert.equal(looksBlankPage({ text: '该网页无法正常运作', htmlLen: 20, media: 0 }), false)
    assert.equal(looksBlankPage({ text: '', htmlLen: 10, media: 0 }), true)
    assert.equal(looksBlankPage({ text: '', htmlLen: 10, media: 2 }), false)
  })

  it('能从说明里抽出错误名', () => {
    assert.equal(netErrorCodeName(0, 'net::ERR_EMPTY_RESPONSE'), 'ERR_EMPTY_RESPONSE')
  })
})
