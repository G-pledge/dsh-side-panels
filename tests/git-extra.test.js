import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isLfsPointer,
  looksLikePatch,
  parseBlamePorcelain,
  parseStashList,
  parseSubmoduleStatus,
  parseUnifiedHunks,
  patchFromHunk,
  safeCloneUrl,
} from '../src/host/git-extra.js'
import { letterFromPorcelain, parseStatusGroups } from '../src/host/git-status.js'

describe('git 额外解析', () => {
  it('冲突文件单独列出，字母是 C', () => {
    assert.equal(letterFromPorcelain('U', 'U'), 'C')
    const groups = parseStatusGroups('UU src/a.js\n M ok.js\n')
    assert.equal(groups.conflicts.length, 1)
    assert.equal(groups.conflicts[0].path, 'src/a.js')
    assert.equal(groups.changes.some((item) => item.path === 'src/a.js'), false)
    assert.equal(groups.letters['src/a.js'], 'C')
    assert.equal(groups.letters['ok.js'], 'M')
  })

  it('统一差异能拆成块，再拼回补丁', () => {
    const text = [
      'diff --git a/a.txt b/a.txt',
      'index 111..222 100644',
      '--- a/a.txt',
      '+++ b/a.txt',
      '@@ -1,2 +1,3 @@',
      ' keep',
      '-old',
      '+new',
      '+more',
      '',
    ].join('\n')
    const hunks = parseUnifiedHunks(text)
    assert.equal(hunks.length, 1)
    assert.equal(hunks[0].hunkHeader.startsWith('@@'), true)
    const patch = patchFromHunk(hunks[0])
    assert.match(patch, /diff --git/)
    assert.match(patch, /\+new/)
    assert.equal(looksLikePatch(patch), true)
  })

  it('储藏、子模块、克隆地址、LFS、归咎', () => {
    const stashes = parseStashList('stash@{0}\x1fabc\x1fWIP on main: x\x1f1700000000\n')
    assert.equal(stashes[0].ref, 'stash@{0}')
    assert.equal(stashes[0].subject, 'WIP on main: x')
    const mods = parseSubmoduleStatus(' 123abcd vendor/lib (v1)\n-deadbeef missing\n')
    assert.equal(mods[0].state, 'ok')
    assert.equal(mods[1].state, 'missing')
    assert.equal(safeCloneUrl('https://github.com/a/b.git'), 'https://github.com/a/b.git')
    assert.equal(safeCloneUrl('git@github.com:a/b.git'), 'git@github.com:a/b.git')
    assert.equal(safeCloneUrl('https://x.com/a.git; rm -rf /'), null)
    assert.equal(isLfsPointer('version https://git-lfs.github.com/spec/v1\noid sha256:aa\nsize 1\n'), true)
    const blame = parseBlamePorcelain([
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa 1 1 1',
      'author Ann',
      'author-time 1700000000',
      '\thello',
    ].join('\n'))
    assert.equal(blame[0].author, 'Ann')
    assert.equal(blame[0].text, 'hello')
  })
})
