import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  humanizeGitError,
  letterFromPorcelain,
  parseBranchLine,
  parsePorcelain,
  parseRefRecords,
  parseStatusGroups,
  parseUpstreamTrack,
  prefixRel,
  gitRelInRepo,
  pickRepo,
  relativeTime,
} from '../src/host/git-status.js'
import {
  parseBlamePorcelain,
  parseUnifiedHunks,
  patchFromHunk,
  safeCloneUrl,
} from '../src/host/git-extra.js'

describe('git 改动字母', () => {
  it('未跟踪显示 U，修改显示 M', () => {
    assert.equal(letterFromPorcelain('?', '?'), 'U')
    assert.equal(letterFromPorcelain(' ', 'M'), 'M')
    assert.equal(letterFromPorcelain('M', ' '), 'M')
    assert.equal(letterFromPorcelain('A', ' '), 'A')
    assert.equal(letterFromPorcelain('U', 'U'), 'C')
    assert.equal(letterFromPorcelain('A', 'A'), 'C')
  })

  it('解析 porcelain 文本', () => {
    const map = parsePorcelain('?? src/a.js\n M README.md\nA  new.txt\n')
    assert.equal(map['src/a.js'], 'U')
    assert.equal(map['README.md'], 'M')
    assert.equal(map['new.txt'], 'A')
  })

  it('暂存和未暂存拆成两组，同一个文件可以两边都有', () => {
    const groups = parseStatusGroups('MM src/a.js\nA  added.js\n?? loose.txt\n D gone.js\n')
    assert.equal(groups.letters['src/a.js'], 'M')
    assert.equal(groups.staged.length, 2)
    assert.equal(groups.staged[0].path, 'src/a.js')
    assert.equal(groups.staged[0].letter, 'M')
    assert.equal(groups.staged[1].path, 'added.js')
    assert.equal(groups.changes.some((item) => item.path === 'src/a.js' && item.letter === 'M'), true)
    assert.equal(groups.changes.some((item) => item.path === 'loose.txt' && item.untracked), true)
    assert.equal(groups.changes.some((item) => item.path === 'gone.js' && item.letter === 'D'), true)
    const conflicted = parseStatusGroups('UU conflict.js\n')
    assert.equal(conflicted.conflicts[0].path, 'conflict.js')
    assert.equal(conflicted.conflicts[0].letter, 'C')
    assert.equal(conflicted.letters['conflict.js'], 'C')
    assert.equal(conflicted.staged.length, 0)
    assert.equal(conflicted.changes.length, 0)
  })

  it('读出当前分支', () => {
    assert.equal(parseBranchLine('## main...origin/main [ahead 1, behind 2]').branch, 'main')
    assert.equal(parseBranchLine('## main...origin/main [ahead 1, behind 2]').ahead, 1)
    assert.equal(parseBranchLine('## HEAD (no branch)').detached, true)
    assert.equal(parseBranchLine('## No commits yet on master').empty, true)
    assert.equal(parseBranchLine('## No commits yet on master').branch, 'master')
  })

  it('把常见 git 报错说成人话', () => {
    assert.equal(
      humanizeGitError('Please tell me who you are.\nhint: skip', { message: 'Command failed' }),
      '还没设置 git 用户名和邮箱，先在终端里配好再提交',
    )
    assert.equal(humanizeGitError('', { code: 'ENOENT', message: 'not found' }), '本机找不到 git')
    assert.match(
      humanizeGitError('error: Your local changes to the following files would be overwritten by checkout:', {}),
      /未提交/,
    )
  })

  it('解析分支列表和时间', () => {
    const refs = parseRefRecords([
      ['*', 'refs/heads/main', 'main', 'abc1234', '1600000000', 'Git Panel', 'init', '[ahead 1, behind 2]'].join('\0'),
      [' ', 'refs/remotes/origin/main', 'origin/main', 'abc1234', '1600000000', 'Git Panel', 'init', ''].join('\0'),
      [' ', 'refs/remotes/origin/HEAD', 'origin/HEAD', 'abc1234', '1600000000', 'Git Panel', 'init', ''].join('\0'),
    ].join('\n'))
    assert.equal(refs.length, 2)
    assert.equal(refs[0].current, true)
    assert.equal(refs[0].ahead, 1)
    assert.equal(refs[0].behind, 2)
    assert.equal(refs[1].kind, 'remote')
    assert.equal(parseUpstreamTrack('[ahead 3]').ahead, 3)
    assert.equal(relativeTime(Math.floor(Date.now() / 1000) - 5 * 86400), '5 天前')
  })

  it('子仓库路径能拼上、也能拆回去', () => {
    assert.equal(prefixRel('app-a', 'README.md'), 'app-a/README.md')
    assert.equal(prefixRel('', 'README.md'), 'README.md')
    const repos = [
      { rel: '', abs: '/w', name: 'w' },
      { rel: 'app-a', abs: '/w/app-a', name: 'app-a' },
      { rel: 'app-b', abs: '/w/app-b', name: 'app-b' },
    ]
    assert.equal(pickRepo(repos, 'app-b/src/a.go').rel, 'app-b')
    assert.equal(gitRelInRepo({ rel: 'app-b' }, 'app-b/src/a.go'), 'src/a.go')
    assert.equal(pickRepo(repos, 'README.md').rel, '')
  })

  it('能拆统一差异块、校验克隆地址、读归咎', () => {
    const text = [
      'diff --git a/a.txt b/a.txt',
      'index 111..222 100644',
      '--- a/a.txt',
      '+++ b/a.txt',
      '@@ -1,2 +1,2 @@',
      ' keep',
      '-old',
      '+new',
      '',
    ].join('\n')
    const hunks = parseUnifiedHunks(text)
    assert.equal(hunks.length, 1)
    assert.equal(hunks[0].hunkHeader, '@@ -1,2 +1,2 @@')
    assert.match(patchFromHunk(hunks[0]), /diff --git a\/a.txt/)
    assert.match(patchFromHunk(hunks[0]), /\+new/)
    assert.equal(safeCloneUrl('https://example.com/a.git'), 'https://example.com/a.git')
    assert.equal(safeCloneUrl('git@example.com:org/a.git'), 'git@example.com:org/a.git')
    assert.equal(safeCloneUrl('file:///tmp/a'), null)
    assert.equal(safeCloneUrl('-u origin'), null)
    const blame = parseBlamePorcelain([
      'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa 1 1 1',
      'author Git Panel',
      'author-time 1600000000',
      '\thello',
    ].join('\n'))
    assert.equal(blame.length, 1)
    assert.equal(blame[0].author, 'Git Panel')
    assert.equal(blame[0].text, 'hello')
  })
})
