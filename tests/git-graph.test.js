import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  clampGraphLimit,
  layoutGraph,
  parseDecorate,
  parseLogRecords,
  parseNameStatus,
} from '../src/host/git-graph.js'

const A = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
const B = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
const C = 'cccccccccccccccccccccccccccccccccccccccc'
const M = 'dddddddddddddddddddddddddddddddddddddddd'

describe('git 提交图', () => {
  it('解析装饰和日志记录', () => {
    const deco = parseDecorate('HEAD -> main, origin/main, origin/HEAD, tag: v1.0, topic')
    assert.equal(deco.detachedHead, false)
    assert.equal(deco.refs.some((item) => item.kind === 'local' && item.name === 'main' && item.current), true)
    assert.equal(deco.refs.some((item) => item.kind === 'remote' && item.name === 'origin/main'), true)
    assert.equal(deco.refs.some((item) => item.kind === 'tag' && item.name === 'v1.0'), true)
    assert.equal(deco.refs.some((item) => item.name === 'origin/HEAD'), false)
    assert.equal(deco.refs.some((item) => item.kind === 'local' && item.name === 'topic'), true)

    const stdout = [
      [M, `${B} ${C}`, 'ddddddd', 'Ann', 'a@x', '1700000000', 'merge topic', 'HEAD -> main'].join('\x1f'),
      [B, A, 'bbbbbbb', 'Bob', 'b@x', '1690000000', 'on main', 'origin/main'].join('\x1f'),
    ].join('\x1e')
    const commits = parseLogRecords(stdout)
    assert.equal(commits.length, 2)
    assert.equal(commits[0].hash, M)
    assert.deepEqual(commits[0].parents, [B, C])
    assert.equal(commits[0].refs[0].current, true)
    assert.equal(commits[1].subject, 'on main')
  })

  it('直线历史都在第 0 道，分叉合并占两道', () => {
    const line = layoutGraph([
      { hash: C, parents: [B] },
      { hash: B, parents: [A] },
      { hash: A, parents: [] },
    ])
    assert.equal(line.every((item) => item.col === 0), true)

    const merge = layoutGraph([
      { hash: M, parents: [B, C] },
      { hash: B, parents: [A] },
      { hash: C, parents: [A] },
      { hash: A, parents: [] },
    ])
    assert.equal(merge[0].col, 0)
    assert.equal(merge[0].segs.some((item) => item.kind === 'fork' && item.x2 === 1), true)
    assert.equal(merge[1].col, 0)
    assert.equal(merge[2].col, 1)
    assert.equal(merge[3].col, 0)
    assert.equal(merge[3].segs.some((item) => item.kind === 'merge' && item.x1 === 1 && item.x2 === 0), true)
  })

  it('解析改名状态，限制条数', () => {
    const files = parseNameStatus('M\tsrc/a.js\nA\tnew.txt\nR100\told.md\tnew.md\nD\tgone.js\n')
    assert.equal(files.length, 4)
    assert.equal(files[0].letter, 'M')
    assert.equal(files[2].letter, 'R')
    assert.equal(files[2].origPath, 'old.md')
    assert.equal(files[2].path, 'new.md')
    assert.equal(clampGraphLimit(9999), 400)
    assert.equal(clampGraphLimit('nope'), 120)
  })
})
