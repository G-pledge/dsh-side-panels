import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { letterFromPorcelain, parsePorcelain } from '../src/host/git-status.js'

describe('git 改动字母', () => {
  it('未跟踪显示 U，修改显示 M', () => {
    assert.equal(letterFromPorcelain('?', '?'), 'U')
    assert.equal(letterFromPorcelain(' ', 'M'), 'M')
    assert.equal(letterFromPorcelain('M', ' '), 'M')
    assert.equal(letterFromPorcelain('A', ' '), 'A')
    assert.equal(letterFromPorcelain('D', ' '), 'D')
  })

  it('解析 porcelain 文本', () => {
    const map = parsePorcelain('?? src/a.js\n M README.md\nA  new.txt\n')
    assert.equal(map['src/a.js'], 'U')
    assert.equal(map['README.md'], 'M')
    assert.equal(map['new.txt'], 'A')
  })
})
