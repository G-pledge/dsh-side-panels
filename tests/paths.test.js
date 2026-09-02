import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isAbsolute, relative, resolve } from 'node:path'
import { isForbiddenRel, isInsideRoot, isSafeName, joinUnderRoot } from '../src/host/paths.js'

describe('文件路径门禁', () => {
  it('不允许往上翻或走进版本库目录', () => {
    assert.equal(isForbiddenRel(''), false)
    assert.equal(isForbiddenRel('src/index.js'), false)
    assert.equal(isForbiddenRel('../secret'), true)
    assert.equal(isForbiddenRel('a/../b'), true)
    assert.equal(isForbiddenRel('.git'), true)
    assert.equal(isForbiddenRel('foo/.git/config'), true)
  })

  it('新名字拒绝斜杠和特殊字符', () => {
    assert.equal(isSafeName('readme.md'), true)
    assert.equal(isSafeName('新文件夹'), true)
    assert.equal(isSafeName(''), false)
    assert.equal(isSafeName('.git'), false)
    assert.equal(isSafeName('a/b'), false)
    assert.equal(isSafeName('a:b'), false)
  })

  it('只允许落在根目录里面', () => {
    const root = resolve('/workspace/app')
    const inside = resolve('/workspace/app/src/a.ts')
    const outside = resolve('/workspace/other/a.ts')
    assert.equal(isInsideRoot(root, root), true)
    assert.equal(isInsideRoot(root, inside), true)
    assert.equal(isInsideRoot(root, outside), false)
    const escaped = relative(root, outside)
    assert.equal(escaped.split(/[/\\]/)[0] === '..' || isAbsolute(escaped), true)
  })

  it('拼接相对路径不会越出根', () => {
    const root = resolve('/workspace/app')
    assert.equal(joinUnderRoot(root, 'src/a.ts'), resolve(root, 'src/a.ts'))
    assert.equal(joinUnderRoot(root, '../secret'), null)
    assert.equal(joinUnderRoot(root, '.git'), null)
    assert.equal(joinUnderRoot(root, '/etc/passwd'), null)
  })
})
